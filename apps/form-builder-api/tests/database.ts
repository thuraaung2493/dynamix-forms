import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import { DataType, newDb } from 'pg-mem';

import type { AppDatabase } from '../src/database/client.js';
import * as schema from '../src/database/schema.js';

const statements = [
  `CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    email varchar(320) NOT NULL UNIQUE,
    display_name varchar(120) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now() NOT NULL,
    last_used_at timestamptz DEFAULT now() NOT NULL,
    expires_at timestamptz NOT NULL,
    absolute_expires_at timestamptz NOT NULL
  )`,
  `CREATE TABLE forms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key varchar(120) NOT NULL,
    title varchar(200) NOT NULL,
    draft_schema jsonb NOT NULL,
    draft_revision integer DEFAULT 1 NOT NULL,
    current_published_version integer,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX forms_owner_key_active_unique
    ON forms (owner_id, key) WHERE deleted_at IS NULL`,
  `CREATE TABLE form_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    version integer NOT NULL,
    schema_version integer NOT NULL,
    schema jsonb NOT NULL,
    published_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    published_at timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(form_id, version)
  )`,
];

export interface TestDatabase {
  database: AppDatabase;
  close: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const memory = newDb({ autoCreateForeignKeyIndices: true });
  memory.public.registerFunction({
    implementation: randomUUID,
    impure: true,
    name: 'gen_random_uuid',
    returns: DataType.uuid,
  });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const originalQuery = pool.query.bind(pool) as (...arguments_: unknown[]) => unknown;
  (pool as unknown as { query: (...arguments_: unknown[]) => unknown }).query = (
    query: unknown,
    ...arguments_: unknown[]
  ) => {
    if (typeof query === 'object' && query !== null) {
      const normalizedQuery = { ...(query as Record<string, unknown>) };
      const wantsArrayRows = normalizedQuery.rowMode === 'array';
      delete normalizedQuery.types;
      delete normalizedQuery.rowMode;
      const result = originalQuery(normalizedQuery, ...arguments_);
      if (wantsArrayRows) {
        return Promise.resolve(result).then((queryResult: unknown) => {
          const typedResult = queryResult as { rows: Record<string, unknown>[] };
          return {
            ...typedResult,
            rows: typedResult.rows.map((row) => Object.values(row)),
          };
        });
      }
      return result;
    }
    return originalQuery(query, ...arguments_);
  };
  for (const statement of statements) {
    await pool.query(statement);
  }

  return {
    close: async () => pool.end(),
    database: drizzle(pool as never, { schema }) as AppDatabase,
  };
}
