import { config } from './config.js';
import { createRuntime } from './runtime.js';

const { app, bootstrapCodes, sql } = await createRuntime();
const server = app.listen(config.port, () => {
  console.log(`Public page: ${config.origin}`);
  console.log(`WebAuthn RP ID: ${config.rpId}`);
  for (const entry of bootstrapCodes) {
    console.log(`One-time setup code for ${entry.alias}: ${entry.code}`);
  }
  if (bootstrapCodes.length > 0) console.log('Setup codes are held in memory only and disappear after successful registration or restart.');
});

function shutdown() {
  server.close(async () => {
    if (sql) await sql.end({ timeout: 5 });
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
