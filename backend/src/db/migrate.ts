/**
 * Standalone migration CLI for deployments:
 *   npm run migrate
 * Applies all pending migrations to the configured DB and exits. Idempotent.
 */
import { initDb } from './index.js';
import { runMigrations } from './migrations.js';

async function main() {
  await initDb();
  await runMigrations();
  console.log('[migrate] All migrations applied. Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err);
  process.exit(1);
});
