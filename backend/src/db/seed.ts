import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initDb } from './index.js';
import { config } from '../config.js';

export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  await initDb();

  // Ensure Admin User (bootstrap account).
  let adminUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@subscrr.app']);
  const adminUserId = adminUser ? adminUser.id : 'admin-user-subscrr-uuid-002';

  if (!adminUser) {
    const adminPassword = config.adminPassword;
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const adminBudgetCents = 50000;

    await db.run(
      `INSERT INTO users (id, email, password_hash, name, role, default_currency, monthly_budget, monthly_budget_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [adminUserId, 'admin@subscrr.app', adminPasswordHash, 'Subscrr Admin', 'admin', 'USD', adminBudgetCents / 100, adminBudgetCents]
    );

    if (!process.env.ADMIN_PASSWORD) {
      console.log('⚠️  Created Admin User: admin@subscrr.app with DEFAULT password — change it immediately in production (set ADMIN_PASSWORD env).');
    } else {
      console.log('✅ Created Admin User: admin@subscrr.app (password from ADMIN_PASSWORD env)');
    }
  }

  // NOTE: The legacy shared demo account (demo@subscrr.app / demo123) was removed
  // for security — every guest shared one dataset and could mutate each other's data.
  // POST /api/auth/demo now provisions an isolated per-session guest account
  // (email domain @demo.subscrr.local) with its own seeded subscriptions and a 24h TTL.

  // Placeholder reference to keep uuid import used if admin bootstrap is skipped.
  void uuidv4;

  console.log('🎉 Database seeding completed!');
}

// Allow direct CLI execution
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  seedDatabase().catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
}
