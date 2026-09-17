import db from './index.js';

/**
 * Versioned, append-only migrations.
 *
 * Rules:
 *  - NEVER edit a migration that has shipped; add a new one.
 *  - Fresh databases run 000 (full schema) then skip 001's ALTERs (column
 *    already exists) and its backfill is a no-op on empty tables.
 *  - Existing databases (pre-migrations) record 000 as baseline and ALTER in
 *    the cents columns with backfill.
 *  - Run via `npm run migrate` in deployment, or automatically at server boot.
 */

interface Migration {
  id: string;
  statements: string[];
  /** Optional data fix-up after statements run. */
  backfill?: () => Promise<void>;
}

const SCHEMA_000 = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  default_currency TEXT DEFAULT 'USD',
  monthly_budget REAL DEFAULT 0,
  monthly_budget_cents INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  category TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'cancelled', 'trial')),
  next_renewal_date TEXT NOT NULL,
  trial_end_date TEXT,
  payment_method TEXT DEFAULT 'Credit Card',
  website_url TEXT,
  color TEXT DEFAULT '#FF2500',
  icon TEXT DEFAULT 'Layers',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'renewal' CHECK(type IN ('renewal', 'trial_ending', 'budget_alert', 'price_change', 'system')),
  is_read INTEGER DEFAULT 0,
  renewal_date TEXT,
  subscription_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leads / Early Access Waitlist Table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT DEFAULT 'landing_page',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for optimal lookup & analytics speed
CREATE INDEX IF NOT EXISTS idx_subs_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_renewal ON subscriptions(next_renewal_date);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pw_tokens ON password_reset_tokens(token);
-- email_preferences (JSON) lives on users; added via migration 002 for
-- pre-existing databases. Fresh DBs get it from 000 + 002 both running.
`;

const migrations: Migration[] = [
  {
    id: '000_full_schema_baseline',
    statements: SCHEMA_000.trim().split(';\n\n').map((s) => (s.endsWith(';') ? s : s + ';')),
  },
  {
    id: '001_integer_cents_money',
    statements: [
      'ALTER TABLE users ADD COLUMN monthly_budget_cents INTEGER DEFAULT 0;',
      'ALTER TABLE subscriptions ADD COLUMN amount_cents INTEGER NOT NULL DEFAULT 0;',
    ],
    backfill: async () => {
      // Copy legacy float dollars into integer cents, then keep the two in sync
      // for any reader that still looks at the old columns. No-op on fresh DBs
      // where the cents columns were always authoritative.
      await db.run('UPDATE users SET monthly_budget_cents = CAST(ROUND(monthly_budget * 100) AS INTEGER) WHERE monthly_budget_cents IS NULL OR monthly_budget_cents = 0;');
      await db.run('UPDATE subscriptions SET amount_cents = CAST(ROUND(amount * 100) AS INTEGER) WHERE amount_cents IS NULL OR amount_cents = 0;');
    },
  },
  {
    id: '002_email_preferences',
    statements: [
      // Per-channel email switches. NULL = default (renewals/trials ON,
      // welcome ONCE, budget ON). JSON so adding channels never needs another
      // ALTER TABLE.
      "ALTER TABLE users ADD COLUMN email_preferences TEXT DEFAULT NULL;",
    ],
    backfill: async () => {
      // No backfill needed: NULL means "use defaults" everywhere.
    },
  },
];

let ran = false;

export async function runMigrations(): Promise<void> {
  if (ran) return;
  ran = true;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      ran_at TEXT DEFAULT (datetime('now'))
    );
  `);

  for (const migration of migrations) {
    const existing = await db.get('SELECT id FROM _migrations WHERE id = ?', [migration.id]);
    if (existing) continue;

    console.log(`[migrate] Running ${migration.id}...`);
    for (const stmt of migration.statements) {
      if (!stmt.trim()) continue;
      try {
        await db.exec(stmt);
      } catch (err: any) {
        const msg = err?.message || '';
        // Idempotency: fresh DBs already have the schema/tables (000 created
        // the cents columns); legacy DBs may already have them from a prior
        // partial run. Both are fine.
        if (!/already exists|duplicate column/i.test(msg)) throw err;
      }
    }

    if (migration.backfill) {
      await migration.backfill();
    }

    await db.run('INSERT INTO _migrations (id) VALUES (?)', [migration.id]);
    console.log(`[migrate] ${migration.id} complete.`);
  }
}
