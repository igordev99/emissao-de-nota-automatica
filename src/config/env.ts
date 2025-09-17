import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional(),
  JWT_SECRET: z.string().min(16).optional(),
  AGENT_BASE_URL: z.string().url().optional(),
  CERT_PFX_PATH: z.string().optional(),
  CERT_PFX_PASSWORD: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  ALLOWED_ORIGINS: z.string().optional(), // CSV de origins permitidos para CORS
  METRICS_ENABLED: z.union([z.literal('0'), z.literal('1')]).optional(),
  HEALTH_MAX_EVENT_LOOP_LAG_MS: z.string().optional(),
  HEALTH_MAX_HEAP_USED_BYTES: z.string().optional(),
  HEALTH_MAX_RSS_BYTES: z.string().optional(),
  HEALTH_DB_TIMEOUT_MS: z.string().optional()
});

export const env = (() => {
  const raw: Record<string, unknown> = { ...process.env };
  // Fornece segredo padrão somente em dev/test
  if (!raw.JWT_SECRET && raw.NODE_ENV !== 'production') {
    raw.JWT_SECRET = 'dev-secret-please-change-123456';
  }
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.JWT_SECRET) {
    // eslint-disable-next-line no-console
    console.error('JWT_SECRET is required in production');
    throw new Error('JWT_SECRET is required in production');
  }
  // Require DATABASE_URL for production by default
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error('DATABASE_URL is required in production');
    throw new Error('DATABASE_URL is required in production');
  }
  // Defaults pós-parse
  const data = parsed.data;
  if (!data.METRICS_ENABLED && data.NODE_ENV !== 'production') {
    data.METRICS_ENABLED = '1';
  }

  // A partir daqui, JWT_SECRET sempre presente em dev/test; exigido em produção
  return data as typeof parsed.data & { JWT_SECRET: string };
})();
