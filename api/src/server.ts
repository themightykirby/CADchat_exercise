import { createApp } from './app.ts';
import { ConfigError, loadConfig } from './config.ts';
import { createSupabaseClient } from './db/supabase.ts';
import { createAuthService } from './middleware/auth.ts';
import { logError, logger } from './logger.ts';
import { createReviewsRepo } from './reviewsRepo.ts';

function main(): void {
  const config = loadConfig();
  const client = createSupabaseClient(config);
  const app = createApp(config, createReviewsRepo(client), createAuthService(config, client));

  const server = app.listen(config.port, '0.0.0.0', () => {
    logger.info('server listening', { port: config.port, nodeEnv: config.nodeEnv });
  });

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutting down', { signal });
    server.close(() => {
      logger.info('server closed');
    });
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

try {
  main();
} catch (err) {
  if (err instanceof ConfigError) {
    logger.error(err.message, { issues: err.issues });
  } else {
    logError('server failed to start', err);
  }
  process.exitCode = 1;
}
