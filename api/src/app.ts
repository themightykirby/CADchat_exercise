import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Config } from './config.ts';
import { requireAuth } from './middleware/auth.ts';
import type { AuthService } from './middleware/auth.ts';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.ts';
import type { ReviewsRepo } from './reviewsRepo.ts';
import { createAuthRouter } from './routes/auth.ts';
import { createReviewsRouter } from './routes/reviews.ts';

export function createApp(config: Config, repo: ReviewsRepo,
  auth: AuthService,
): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  const loopback = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowed =
          !origin ||
          config.corsOrigins.includes(origin) ||
          (config.nodeEnv === 'development' && loopback.test(origin));
        callback(null, allowed);
      },
    }),
  );
  app.use(express.json({ limit: '10kb' }));

  app.use('/auth', createAuthRouter(auth));
  const guard: express.RequestHandler[] = config.authRequired ? [requireAuth(auth)] : [];
  app.use('/reviews', ...guard, createReviewsRouter(repo));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
