import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),
    AI_SERVICE_URL: z.string().url().default('http://127.0.0.1:8001'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  });

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const formatted = error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Invalid environment configuration:\n${formatted}`);
  } else {
    console.error('Failed to parse environment variables:', error);
  }
  process.exit(1);
}

export const env = parsedEnv;
