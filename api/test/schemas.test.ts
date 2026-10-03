import { describe, expect, it } from 'vitest';
import { createReviewBody, cubeIdQuery, idParams, patchReviewBody } from '../src/schemas.ts';

const UUID = '3f2b8c1e-9d4a-4e6b-8a57-1c2d3e4f5a6b';

describe('createReviewBody', () => {
  it('accepts a valid body', () => {
    const result = createReviewBody.safeParse({ cube_id: 'cube-1', comment: 'Chamfer the edge.' });
    expect(result.success).toBe(true);
  });

  it('trims both fields', () => {
    const result = createReviewBody.safeParse({ cube_id: '  cube-1  ', comment: '  hi  ' });
    expect(result.success && result.data).toEqual({ cube_id: 'cube-1', comment: 'hi' });
  });

  it('rejects blank or whitespace-only fields', () => {
    expect(createReviewBody.safeParse({ cube_id: '', comment: 'hi' }).success).toBe(false);
    expect(createReviewBody.safeParse({ cube_id: 'cube-1', comment: '   ' }).success).toBe(false);
  });

  it('accepts a cube_id of 100 chars and rejects 101', () => {
    expect(
      createReviewBody.safeParse({ cube_id: 'a'.repeat(100), comment: 'hi' }).success,
    ).toBe(true);
    expect(
      createReviewBody.safeParse({ cube_id: 'a'.repeat(101), comment: 'hi' }).success,
    ).toBe(false);
  });

  it('accepts a comment of 2000 chars and rejects 2001', () => {
    expect(
      createReviewBody.safeParse({ cube_id: 'cube-1', comment: 'a'.repeat(2000) }).success,
    ).toBe(true);
    expect(
      createReviewBody.safeParse({ cube_id: 'cube-1', comment: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });

  it('counts length after trimming', () => {
    const padded = ` ${'a'.repeat(100)} `;
    expect(createReviewBody.safeParse({ cube_id: padded, comment: 'hi' }).success).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(createReviewBody.safeParse({ comment: 'hi' }).success).toBe(false);
    expect(createReviewBody.safeParse({ cube_id: 'cube-1' }).success).toBe(false);
  });

  it('rejects non-string fields', () => {
    expect(createReviewBody.safeParse({ cube_id: 1, comment: 'hi' }).success).toBe(false);
  });

  it('rejects unknown keys such as status or id', () => {
    expect(
      createReviewBody.safeParse({ cube_id: 'cube-1', comment: 'hi', status: 'approved' }).success,
    ).toBe(false);
    expect(
      createReviewBody.safeParse({ cube_id: 'cube-1', comment: 'hi', id: UUID }).success,
    ).toBe(false);
  });
});

describe('patchReviewBody', () => {
  it('accepts approved and rejected', () => {
    expect(patchReviewBody.safeParse({ status: 'approved' }).success).toBe(true);
    expect(patchReviewBody.safeParse({ status: 'rejected' }).success).toBe(true);
  });

  it('rejects pending and unknown statuses', () => {
    expect(patchReviewBody.safeParse({ status: 'pending' }).success).toBe(false);
    expect(patchReviewBody.safeParse({ status: 'done' }).success).toBe(false);
  });

  it('rejects a missing status and unknown keys', () => {
    expect(patchReviewBody.safeParse({}).success).toBe(false);
    expect(patchReviewBody.safeParse({ status: 'approved', comment: 'x' }).success).toBe(false);
  });
});

describe('idParams', () => {
  it('accepts a uuid', () => {
    expect(idParams.safeParse({ id: UUID }).success).toBe(true);
  });

  it('rejects a non-uuid and a missing id', () => {
    expect(idParams.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
    expect(idParams.safeParse({}).success).toBe(false);
  });
});

describe('cubeIdQuery', () => {
  it('accepts and trims a cube_id', () => {
    const result = cubeIdQuery.safeParse({ cube_id: '  cube-1 ' });
    expect(result.success && result.data).toEqual({ cube_id: 'cube-1' });
  });

  it('rejects missing, empty and over-long cube_id', () => {
    expect(cubeIdQuery.safeParse({}).success).toBe(false);
    expect(cubeIdQuery.safeParse({ cube_id: '' }).success).toBe(false);
    expect(cubeIdQuery.safeParse({ cube_id: 'a'.repeat(101) }).success).toBe(false);
  });

  it('rejects a repeated query parameter (array)', () => {
    expect(cubeIdQuery.safeParse({ cube_id: ['a', 'b'] }).success).toBe(false);
  });
});
