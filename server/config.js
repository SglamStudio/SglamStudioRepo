import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).default('postgres://glamstudio:glamstudio@localhost:5432/glamstudio'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  ADMIN_SESSION_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  ACTIVATION_TOKEN_MINUTES: z.coerce.number().int().min(5).max(60).default(10),
  CSRF_SECRET: z.string().min(32).default('development-only-change-this-csrf-secret-32-chars')
});

const parsed = schema.parse(process.env);
if (parsed.NODE_ENV === 'production' && (parsed.CSRF_SECRET.startsWith('development-only') || parsed.CSRF_SECRET.startsWith('replace-with-'))) {
  throw new Error('CSRF_SECRET must be replaced in production');
}

export const config = {
  ...parsed,
  databaseSsl: parsed.DATABASE_SSL === 'true',
  sessionCookieName: parsed.NODE_ENV === 'production' ? '__Host-sg_admin' : 'sg_admin',
  isProduction: parsed.NODE_ENV === 'production'
};
