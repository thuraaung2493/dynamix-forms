import 'dotenv/config';

import { z } from 'zod';

const environmentSchema = z.object({
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

export interface AppConfig {
  appOrigin: string;
  databaseUrl: string;
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  session: {
    absoluteLifetimeMs: number;
    cookieName: string;
    rollingLifetimeMs: number;
    secureCookie: boolean;
  };
}

const DAYS = 24 * 60 * 60 * 1_000;

export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = environmentSchema.parse(environment);
  const secureCookie = parsed.NODE_ENV === 'production';

  return {
    appOrigin: new URL(parsed.APP_ORIGIN).origin,
    databaseUrl: parsed.DATABASE_URL,
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    session: {
      absoluteLifetimeMs: 30 * DAYS,
      cookieName: secureCookie ? '__Host-dynamix_session' : 'dynamix_session',
      rollingLifetimeMs: 7 * DAYS,
      secureCookie,
    },
  };
}

