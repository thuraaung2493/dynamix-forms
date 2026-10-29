import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  out: './migrations',
  schema: './src/database/schema.ts',
  strict: true,
  verbose: true,
});

