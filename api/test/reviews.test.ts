import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import supertest from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import type { AuthService } from '../src/middleware/auth.ts';
import { loadConfig } from '../src/config.ts';
import type { Config } from '../src/config.ts';
import { logError } from '../src/logger.ts';
import { createReviewsRepo } from '../src/reviewsRepo.ts';
import type { Review } from '../src/types.ts';

vi.mock('../src/logger.ts', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

const config: Config = {
  port: 3000,
  nodeEnv: 'test',
  corsOrigins: ['http://localhost:5173'],
  supabaseUrl: 'http://supabase.test',
  supabaseSecretKey: 'sb_secret_test',
  authRequired: true,
};

const session = { access_token: 'valid-token', refresh_token: 'r1', expires_at: 1 };
const authService: AuthService = {
  verifyToken: async (token) => (token === 'valid-token' ? 'user-1' : null),
  signIn: async (email, password) =>
    email === 'a@b.co' && password === 'pw' ? session : null,
  refresh: async (token) => (token === 'r1' ? session : null),
};

function request(app: Parameters<typeof supertest>[0]) {
  return supertest.agent(app).set('Authorization', 'Bearer valid-token');
}

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

interface DbError {
  code: string;
  message: string;
}

function createFakeClient() {
  const rows: Review[] = [];
  const state: { failNext: DbError | null } = { failNext: null };

  function from(_table: string) {
    let op: 'select' | 'insert' | 'update' | 'delete' | undefined;
    let payload: Record<string, unknown> = {};
    const filters: Array<[string, unknown]> = [];
    let orderBy: { column: string; ascending: boolean } | undefined;

    function execute(): { data: unknown[]; error: DbError | null } {
      if (state.failNext) {
        const error = state.failNext;
        state.failNext = null;
        return { data: [], error };
      }
      const matches = rows.filter((r) =>
        filters.every(([col, val]) => (r as unknown as Record<string, unknown>)[col] === val),
      );
      if (op === 'insert') {
        const now = new Date().toISOString();
        const row = {
          id: randomUUID(),
          status: 'pending',
          created_at: now,
          updated_at: now,
          ...payload,
        } as Review;
        rows.push(row);
        return { data: [row], error: null };
      }
      if (op === 'update') {
        matches.forEach((r) => Object.assign(r, payload));
        return { data: matches, error: null };
      }
      if (op === 'delete') {
        matches.forEach((r) => rows.splice(rows.indexOf(r), 1));
        return { data: matches.map((r) => ({ id: r.id })), error: null };
      }
      if (orderBy) {
        const { column, ascending } = orderBy;
        const key = (r: Review) => String((r as unknown as Record<string, unknown>)[column]);
        const sorted = [...matches].sort((a, b) => key(a).localeCompare(key(b)));
        return { data: ascending ? sorted : sorted.reverse(), error: null };
      }
      return { data: matches, error: null };
    }

    const builder = {
      insert(p: Record<string, unknown>) {
        op = 'insert';
        payload = p;
        return builder;
      },
      update(p: Record<string, unknown>) {
        op = 'update';
        payload = p;
        return builder;
      },
      delete() {
        op = 'delete';
        return builder;
      },
      select() {
        op ??= 'select';
        return builder;
      },
      order(column: string, opts: { ascending: boolean }) {
        orderBy = { column, ascending: opts.ascending };
        return builder;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return builder;
      },
      single() {
        const { data, error } = execute();
        return Promise.resolve({ data: data[0] ?? null, error });
      },
      maybeSingle() {
        const { data, error } = execute();
        return Promise.resolve({ data: data[0] ?? null, error });
      },
      then(resolve: (value: { data: unknown[]; error: DbError | null }) => unknown) {
        return Promise.resolve(execute()).then(resolve);
      },
    };
    return builder;
  }

  function rpc(name: string, args: { p_cube_id: string; p_comment: string }) {
    if (name !== 'replace_review') throw new Error(`unexpected rpc ${name}`);
    if (state.failNext) {
      const error = state.failNext;
      state.failNext = null;
      return Promise.resolve({ data: null, error });
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i]?.cube_id === args.p_cube_id) rows.splice(i, 1);
    }
    const now = new Date().toISOString();
    const row = {
      id: randomUUID(),
      cube_id: args.p_cube_id,
      comment: args.p_comment,
      status: 'pending',
      created_at: now,
      updated_at: now,
    } as Review;
    rows.push(row);
    return Promise.resolve({ data: row, error: null });
  }

  return { client: { from, rpc } as unknown as SupabaseClient, state };
}

describe('authentication', () => {
  const app = () => createApp(config, createReviewsRepo(createFakeClient().client), authService);

  it('rejects a request with no token', async () => {
    const res = await supertest(app()).get('/reviews?cube_id=cube-1');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const res = await supertest(app())
      .get('/reviews?cube_id=cube-1')
      .set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  it('logs in with valid credentials', async () => {
    const res = await supertest(app()).post('/auth/login').send({ email: 'a@b.co', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(session);
  });

  it('rejects bad credentials with 401 and a generic message', async () => {
    const res = await supertest(app()).post('/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects a malformed login body with 400', async () => {
    const res = await supertest(app()).post('/auth/login').send({ email: 'nope' });
    expect(res.status).toBe(400);
  });

  it('refreshes a session, and rejects an unknown refresh token', async () => {
    const ok = await supertest(app()).post('/auth/refresh').send({ refresh_token: 'r1' });
    expect(ok.status).toBe(200);
    const bad = await supertest(app()).post('/auth/refresh').send({ refresh_token: 'zzz' });
    expect(bad.status).toBe(401);
  });

  it('accepts a valid token', async () => {
    const res = await supertest(app())
      .get('/reviews?cube_id=cube-1')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
  });
});

describe('CORS preflight', () => {
  const preflight = (cfg: Config, origin: string) =>
    supertest(createApp(cfg, createReviewsRepo(createFakeClient().client), authService))
      .options(`/reviews/${MISSING_ID}`)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'content-type,authorization');

  it('allows the configured origin before auth runs', async () => {
    const res = await preflight(config, 'http://localhost:5173');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('allows each origin in a comma-separated list, and only those', async () => {
    const multi = { ...config, corsOrigins: ['http://localhost:5173', 'http://localhost:5174'] };
    for (const origin of multi.corsOrigins) {
      const res = await preflight(multi, origin);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
    const other = await preflight(multi, 'http://localhost:5175');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('parses CORS_ORIGIN as a trimmed list and rejects a wildcard', () => {
    const env = { CORS_ORIGIN: 'http://localhost:5173, http://localhost:5174', SUPABASE_URL: 'http://s.test', SUPABASE_SECRET_KEY: 'k' };
    expect(loadConfig(env).corsOrigins).toEqual(['http://localhost:5173', 'http://localhost:5174']);
    expect(() => loadConfig({ ...env, CORS_ORIGIN: '*' })).toThrow();
  });

  it('does not allow other origins outside development', async () => {
    const res = await preflight(config, 'http://localhost:5174');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows any loopback port in development, but never other hosts', async () => {
    const dev = { ...config, nodeEnv: 'development' as const };
    const ok = await preflight(dev, 'http://127.0.0.1:5174');
    expect(ok.headers['access-control-allow-origin']).toBe('http://127.0.0.1:5174');
    const bad = await preflight(dev, 'http://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('auth disabled', () => {
  it('serves /reviews without a token when authRequired is false', async () => {
    const open = createApp(
      { ...config, authRequired: false },
      createReviewsRepo(createFakeClient().client),
      authService,
    );
    const res = await supertest(open).get('/reviews?cube_id=cube-1');
    expect(res.status).toBe(200);
  });
});

describe('reviews API', () => {
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof createFakeClient>;

  beforeEach(() => {
    vi.mocked(logError).mockClear();
    db = createFakeClient();
    app = createApp(config, createReviewsRepo(db.client), authService);
  });

  async function seed(cubeId = 'cube-1', comment = 'Chamfer the edge.'): Promise<Review> {
    const res = await request(app).post('/reviews').send({ cube_id: cubeId, comment });
    return res.body as Review;
  }

  describe('POST /reviews', () => {
    it('creates a pending review and returns 201', async () => {
      const res = await request(app)
        .post('/reviews')
        .send({ cube_id: 'cube-1', comment: 'Chamfer the edge.' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        cube_id: 'cube-1',
        comment: 'Chamfer the edge.',
        status: 'pending',
      });
      expect(typeof res.body.id).toBe('string');
    });

    it('returns 400 with issues for a blank comment', async () => {
      const res = await request(app).post('/reviews').send({ cube_id: 'cube-1', comment: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(res.body.issues[0].path).toBe('comment');
    });

    it('returns 400 when the body contains an unknown key such as status', async () => {
      const res = await request(app)
        .post('/reviews')
        .send({ cube_id: 'cube-1', comment: 'hi', status: 'approved' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('replaces the existing review on the same cube', async () => {
      const first = await seed('cube-1', 'first');
      const res = await request(app).post('/reviews').send({ cube_id: 'cube-1', comment: 'second' });
      expect(res.status).toBe(201);
      expect(res.body.id).not.toBe(first.id);

      const list = await request(app).get('/reviews?cube_id=cube-1');
      expect(list.body).toHaveLength(1);
      expect(list.body[0]).toMatchObject({ comment: 'second' });
      expect((await request(app).get(`/reviews/${first.id}`)).status).toBe(404);
    });

    it('does not touch reviews of other cubes when replacing', async () => {
      const other = await seed('cube-2', 'other');
      await seed('cube-1', 'first');
      await request(app).post('/reviews').send({ cube_id: 'cube-1', comment: 'second' });
      const list = await request(app).get('/reviews?cube_id=cube-2');
      expect(list.body).toEqual([other]);
    });

    it('keeps the existing review and returns 500 when the replace fails', async () => {
      const first = await seed('cube-1', 'first');
      db.state.failNext = { code: 'XX000', message: 'boom' };
      const res = await request(app).post('/reviews').send({ cube_id: 'cube-1', comment: 'second' });
      expect(res.status).toBe(500);
      const list = await request(app).get('/reviews?cube_id=cube-1');
      expect(list.body).toEqual([first]);
    });

    it('returns 400 for malformed JSON', async () => {
      const res = await request(app)
        .post('/reviews')
        .set('Content-Type', 'application/json')
        .send('{"cube_id": ');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Malformed JSON body' });
    });

    it('returns 413 for a body over 10kb', async () => {
      const res = await request(app)
        .post('/reviews')
        .send({ cube_id: 'cube-1', comment: 'x'.repeat(20_000) });
      expect(res.status).toBe(413);
    });
  });

  describe('GET /reviews?cube_id=', () => {
    it('returns [] when the cube has no review', async () => {
      const res = await request(app).get('/reviews').query({ cube_id: 'cube-1' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns a one-item array when the cube has a review', async () => {
      const created = await seed('cube-1');
      const res = await request(app).get('/reviews').query({ cube_id: 'cube-1' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([created]);
    });

    it('returns 400 when cube_id is missing', async () => {
      const res = await request(app).get('/reviews');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('GET /reviews/:id', () => {
    it('returns the review', async () => {
      const created = await seed();
      const res = await request(app).get(`/reviews/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(created);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).get(`/reviews/${MISSING_ID}`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Review not found' });
    });

    it('returns 400 for an id that is not a uuid', async () => {
      const res = await request(app).get('/reviews/not-a-uuid');
      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /reviews/:id', () => {
    it('approves a pending review', async () => {
      const created = await seed();
      const res = await request(app).patch(`/reviews/${created.id}`).send({ status: 'approved' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
    });

    it('returns 409 when the review is already decided', async () => {
      const created = await seed();
      await request(app).patch(`/reviews/${created.id}`).send({ status: 'approved' });
      const again = await request(app).patch(`/reviews/${created.id}`).send({ status: 'rejected' });
      expect(again.status).toBe(409);
      expect(again.body).toEqual({ error: 'Review is already approved' });
    });

    it('returns 400 when trying to set pending', async () => {
      const created = await seed();
      const res = await request(app).patch(`/reviews/${created.id}`).send({ status: 'pending' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).patch(`/reviews/${MISSING_ID}`).send({ status: 'approved' });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Review not found' });
    });
  });

  describe('DELETE /reviews/:id', () => {
    it('deletes the review and returns 204', async () => {
      const created = await seed();
      const res = await request(app).delete(`/reviews/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.text).toBe('');
      const after = await request(app).get(`/reviews/${created.id}`);
      expect(after.status).toBe(404);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).delete(`/reviews/${MISSING_ID}`);
      expect(res.status).toBe(404);
    });
  });

  describe('app behavior', () => {
    it('serves /health without a token', async () => {
      const res = await supertest(createApp(config, createReviewsRepo(createFakeClient().client), authService)).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('returns 404 for an unknown route', async () => {
      const res = await request(app).get('/nope');
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Route not found' });
    });

    it('hides database error details behind a generic 500 and logs them', async () => {
      db.state.failNext = { code: 'XX000', message: 'secret internal detail' };
      const res = await request(app).get(`/reviews/${MISSING_ID}`);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect(JSON.stringify(res.body)).not.toContain('secret internal detail');
      expect(logError).toHaveBeenCalled();
    });

    it('sets the CORS origin header and no X-Powered-By', async () => {
      const res = await request(app)
        .get('/reviews')
        .query({ cube_id: 'cube-1' })
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });
});
