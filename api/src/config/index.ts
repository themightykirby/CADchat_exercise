import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z
    .string()
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean))
    .pipe(z.array(z.url()).min(1)),
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  AUTH_REQUIRED: z.stringbool().default(true),
});

export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  corsOrigins: string[];
  supabaseUrl: string;
  supabaseSecretKey: string;
  authRequired: boolean;
}

export class ConfigError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super('Invalid environment configuration');
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
  }
  const e = result.data;
  return {
    port: e.PORT,
    nodeEnv: e.NODE_ENV,
    corsOrigins: e.CORS_ORIGIN,
    supabaseUrl: e.SUPABASE_URL,
    supabaseSecretKey: e.SUPABASE_SECRET_KEY,
    authRequired: e.AUTH_REQUIRED,
  };
}
