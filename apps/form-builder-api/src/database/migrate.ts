import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { readConfig } from '../config.js';
import { createDatabaseConnection } from './client.js';

const config = readConfig();
const connection = createDatabaseConnection(config.databaseUrl);
const migrationsFolder = fileURLToPath(new URL('../../migrations', import.meta.url));

try {
  await migrate(connection.database, { migrationsFolder });
} finally {
  await connection.pool.end();
}

