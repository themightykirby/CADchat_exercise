import express from 'express';
import type { Response } from 'express';
import type { z } from 'zod';
import { HttpError } from '../errors.ts';
import type { ReviewsRepo } from '../reviewsRepo.ts';
import { createReviewBody, cubeIdQuery, idParams, patchReviewBody } from '../schemas.ts';

function validate<S extends z.ZodType>(
  schema: S,
  data: unknown,
  res: Response,
): z.infer<S> | undefined {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  res.status(400).json({
    error: 'Validation failed',
    issues: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
  return undefined;
}

export function createReviewsRouter(repo: ReviewsRepo): express.Router {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const body = validate(createReviewBody, req.body, res);
    if (!body) return;
    const review = await repo.create(body);
    res.status(201).json(review);
  });

  router.get('/', async (req, res) => {
    const query = validate(cubeIdQuery, req.query, res);
    if (!query) return;
    const reviews = await repo.listByCube(query.cube_id);
    res.json(reviews);
  });

  router.get('/:id', async (req, res) => {
    const params = validate(idParams, req.params, res);
    if (!params) return;
    const review = await repo.getById(params.id);
    if (!review) throw new HttpError(404, 'Review not found');
    res.json(review);
  });

  router.patch('/:id', async (req, res) => {
    const params = validate(idParams, req.params, res);
    if (!params) return;
    const body = validate(patchReviewBody, req.body, res);
    if (!body) return;
    const review = await repo.updateStatus(params.id, body.status);
    res.json(review);
  });

  router.delete('/:id', async (req, res) => {
    const params = validate(idParams, req.params, res);
    if (!params) return;
    await repo.remove(params.id);
    res.status(204).end();
  });

  return router;
}
