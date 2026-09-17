/**
 * Subscrr unified production server — ONE process, ONE port.
 *
 * Serves on a single HTTP listener:
 *   1. Express API      (/api/*, /uploads/*)          — the backend app
 *   2. Next.js app      (pages, /_next, /admin,       — frontend + Payload CMS
 *                        /api/payload, /graphql)
 *
 * Boot sequence mirrors backend/src/server.ts: migrations → seed → scheduler,
 * then the combined HTTP listener. In split-dev (two servers) this file is
 * not used — `npm run dev` at the repo root still runs both dev servers.
 *
 * Used by: `npm run start:all` locally, and the Render deployment
 * (see render.yaml + docs/DEPLOY-RENDER.md).
 */
// Load Next from the frontend package (its node_modules), not the root —
// the root has no 'next' dependency.
import next from './frontend/next-bridge.mjs';
import express from './backend/express-bridge.mjs';
import { createApp } from './backend/dist/app.js';
import { config as backendConfig } from './backend/dist/config.js';
import { runMigrations } from './backend/dist/db/migrations.js';
import { seedDatabase } from './backend/dist/db/seed.js';
import { startScheduler } from './backend/dist/services/scheduler.js';

const port = Number(process.env.PORT || 3000);
const hostname = process.env.HOST || '0.0.0.0';

// Next.js request handler. In production this uses the prebuilt
// frontend/.next output; no dev compilation happens here.
const nextApp = next({ dev: false, dir: './frontend' });
const nextHandler = nextApp.getRequestHandler();

async function main() {
  // 1. Database schema (versioned migrations) + idempotent bootstrap seed.
  await runMigrations();
  await seedDatabase();

  // 2. Background renewal/trial/budget alert scheduler (single instance only).
  startScheduler();

  // 3. Prepare Next.js (loads routes + Payload config into this process).
  await nextApp.prepare();

  const app = express();
  app.set('trust proxy', 1); // Behind Render's proxy — correct client IPs
  app.disable('x-powered-by');

  // The full backend API (helmet, CORS, rate limiters, routes, error
  // handler). Its error handler only fires on errors, so unmatched requests
  // fall through to Next below. /api/payload requests pass through
  // untouched by design (Next-owned → Payload REST/GraphQL).
  app.use(createApp());

  // Everything Express didn't answer goes to Next.js (marketing site,
  // dashboard, Payload admin + REST + GraphQL). Plain middleware form —
  // matches all methods/paths on both Express 4 and 5.
  app.use((req, res) => nextHandler(req, res));

  app.listen(port, hostname, () => {
    console.log(`
🚀 ===============================================
⚡ Subscrr unified server (single service)
📍 URL:          http://localhost:${port}
📦 Backend API:  /api/*, /uploads/*            (Express dist build)
🎨 Frontend:     pages, /_next, /admin,
                 /api/payload, /graphql        (Next.js + Payload CMS)
📊 Environment:  ${backendConfig.nodeEnv}
💾 App DB:       ${backendConfig.dbPath}
===============================================
    `);
  });

  // Graceful shutdown (Render sends SIGTERM on redeploys).
  const shutdown = (sig) => {
    console.log(`${sig} received. Shutting down gracefully...`);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('❌ Unified server failed to start:', err);
  process.exit(1);
});
