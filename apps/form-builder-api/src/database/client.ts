import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export type AppDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseConnection {
  database: AppDatabase;
  pool: Pool;
}

export function createDatabaseConnection(connectionString: string): DatabaseConnection {
  const pool = new Pool({
    allowExitOnIdle: true,
    connectionString,
    max: 5,
  });

  return {
    database: drizzle(pool, { schema }),
    pool,
  };
}

