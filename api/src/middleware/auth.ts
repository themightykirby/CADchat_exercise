import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';
import { createSupabaseClient } from '../db/supabase.ts';
import type { Config } from '../config.ts';
import { HttpError } from '../errors.ts';

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AuthService {
  verifyToken(token: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<AuthSession | null>;
  refresh(refreshToken: string): Promise<AuthSession | null>;
}

function toSession(
  session: { access_token: string; refresh_token: string; expires_at?: number } | null,
): AuthSession | null {
  if (!session) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? 0,
  };
}

export function createAuthService(config: Config, dbClient: SupabaseClient): AuthService {
  const isolated = (): SupabaseClient =>
    createSupabaseClient(config, { autoRefreshToken: false });

  return {
    async verifyToken(token) {
      const { data, error } = await dbClient.auth.getClaims(token);
      if (error || !data?.claims.sub) return null;
      return data.claims.sub;
    },

    async signIn(email, password) {
      const { data, error } = await isolated().auth.signInWithPassword({ email, password });
      if (error) {
        if (error.status && error.status >= 500) throw new HttpError(502, 'Auth service unavailable');
        return null;
      }
      return toSession(data.session);
    },

    async refresh(refreshToken) {
      const { data, error } = await isolated().auth.refreshSession({
        refresh_token: refreshToken,
      });
      if (error) {
        if (error.status && error.status >= 500) throw new HttpError(502, 'Auth service unavailable');
        return null;
      }
      return toSession(data.session);
    },
  };
}

export function requireAuth(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new HttpError(401, 'Authentication required');
    }
    const userId = await auth.verifyToken(token);
    if (!userId) throw new HttpError(401, 'Invalid or expired token');
    res.locals.userId = userId;
    next();
  };
}
