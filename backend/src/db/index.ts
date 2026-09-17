import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const sqlite = sqlite3.verbose();
const rawDb = new sqlite.Database(config.dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
  } else {
    console.log(` Connected to SQLite database at ${config.dbPath}`);
  }
});

// Enable foreign keys and WAL mode for high concurrency
rawDb.run('PRAGMA foreign_keys = ON;');
rawDb.run('PRAGMA journal_mode = WAL;');
// Wait up to 5s for locks instead of failing instantly with SQLITE_BUSY
// (multiple processes: server, tests, migrations, hot-reload restarts).
rawDb.run('PRAGMA busy_timeout = 5000;');

// Promise wrappers
export const db = {
  get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  },

  all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  },

  run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },

  exec(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      rawDb.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
};

/**
 * Legacy compatibility shim: schema creation now lives entirely in the
 * versioned migration runner (db/migrations.ts, migration 000). initDb()
 * just forwards so existing callers (server boot, tests, seed) keep working.
 * No runtime file dependency — safe in compiled Docker images.
 */
export async function initDb(): Promise<void> {
  const { runMigrations } = await import('./migrations.js');
  await runMigrations();
}

export default db;
