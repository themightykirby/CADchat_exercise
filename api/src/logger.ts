import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

type Level = 'info' | 'warn' | 'error';

const LOG_DIR = join(import.meta.dirname, '..', 'logs');
const LOG_FILE = join(LOG_DIR, 'app.log');

let dirReady: Promise<unknown> | undefined;

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  dirReady ??= mkdir(LOG_DIR, { recursive: true });
  dirReady
    .then(() => appendFile(LOG_FILE, `${line}\n`))
    .catch((err: unknown) => {
      console.error(`logger: could not write to ${LOG_FILE}`, err instanceof Error ? err.message : err);
    });
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};

export function logError(
  message: string,
  err: unknown,
  meta?: Record<string, unknown>,
  withStack = true,
): void {
  const detail =
    err instanceof Error
      ? { error: err.message, ...(withStack ? { stack: err.stack } : {}) }
      : { error: String(err) };
  write('error', message, { ...meta, ...detail });
}
