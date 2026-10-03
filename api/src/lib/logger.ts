type Level = 'info' | 'warn' | 'error';

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
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
