import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createDatabaseConnection } from './database/client.js';

const config = readConfig();
export const connection = createDatabaseConnection(config.databaseUrl);
export const app = createApp({ config, database: connection.database });
