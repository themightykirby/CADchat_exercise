import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../lib/errors.ts';
import { logError, logger } from '../lib/logger.ts';

interface LibraryError {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
  message?: unknown;
}

function statusOf(err: unknown): number {
  if (err instanceof HttpError) return err.status;
  if (typeof err === 'object' && err !== null) {
    const { status, statusCode } = err as LibraryError;
    const code = typeof status === 'number' ? status : statusCode;
    if (typeof code === 'number' && code >= 400 && code <= 599) return code;
  }
  return 500;
}

function messageOf(err: unknown, status: number): string {
  if (status >= 500) return 'Internal server error';
  if (err instanceof HttpError) return err.message;
  const { type, message } = err as LibraryError;
  if (type === 'entity.parse.failed') return 'Malformed JSON body';
  return typeof message === 'string' ? message : 'Bad request';
}

export const notFoundHandler: RequestHandler = (req, res) => {
  logger.warn('route not found', { method: req.method, path: req.path, status: 404 });
  res.status(404).json({ error: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = statusOf(err);
  const message = messageOf(err, status);
  const meta = { method: req.method, path: req.path, status };

  if (status >= 500) {
    logError('unhandled error', err, meta);
  } else {
    logger.warn('request failed', { ...meta, error: message });
  }

  res.status(status).json({ error: message });
};
