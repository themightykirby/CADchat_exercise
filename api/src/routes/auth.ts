import express from 'express';
import { HttpError } from '../errors.ts';
import type { AuthService } from '../middleware/auth.ts';
import { loginBody, refreshBody } from '../schemas.ts';

export function createAuthRouter(auth: AuthService): express.Router {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const body = loginBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Email and password are required');
    const session = await auth.signIn(body.data.email, body.data.password);
    if (!session) throw new HttpError(401, 'Invalid email or password');
    res.json(session);
  });

  router.post('/refresh', async (req, res) => {
    const body = refreshBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'refresh_token is required');
    const session = await auth.refresh(body.data.refresh_token);
    if (!session) throw new HttpError(401, 'Invalid or expired refresh token');
    res.json(session);
  });

  return router;
}
