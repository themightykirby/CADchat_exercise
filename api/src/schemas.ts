import { z } from 'zod';

export const createReviewBody = z.strictObject({
  cube_id: z.string().trim().min(1).max(100),
  comment: z.string().trim().min(1).max(2000),
});

export const patchReviewBody = z.strictObject({
  status: z.enum(['approved', 'rejected']),
});

export const loginBody = z.strictObject({
  email: z.email().max(320),
  password: z.string().min(1).max(200),
});

export const refreshBody = z.strictObject({
  refresh_token: z.string().min(1).max(2000),
});

export const idParams = z.object({
  id: z.uuid(),
});

export const cubeIdQuery = z.object({
  cube_id: z.string().trim().min(1).max(100),
});

export type CreateReviewBody = z.infer<typeof createReviewBody>;
export type PatchReviewBody = z.infer<typeof patchReviewBody>;
