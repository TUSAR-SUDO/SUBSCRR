import { createApp } from './app.js';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { runMigrations } from './db/migrations.js';
import { seedDatabase } from './db/seed.js';
import { startScheduler } from './services/scheduler.js';

async function startServer() {
  try {
    // 1. Initialize SQLite Database Schema
    await initDb();
    await runMigrations();

    // 2. Auto-seed Demo Data if necessary
    await seedDatabase();

    // 3. Start background renewal scheduler
    startScheduler();

    // 4. Start Express App
    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`
🚀 ==========================================
⚡ Subscrr Backend API running!
📍 URL: http://localhost:${config.port}
📊 Environment: ${config.nodeEnv}
💾 Database: SQLite (${config.dbPath})
==========================================
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed.');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
