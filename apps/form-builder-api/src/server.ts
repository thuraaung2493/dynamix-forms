import { app, connection } from './runtime.js';
import { readConfig } from './config.js';

const config = readConfig();
const server = app.listen(config.port, () => {
  console.log(`Dynamix Forms API listening on port ${config.port}.`);
});

async function shutdown(): Promise<void> {
  server.close(async () => {
    await connection.pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
