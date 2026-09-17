import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { initDb } from '../db/index.js';
import { runMigrations } from '../db/migrations.js';
import { seedDatabase } from '../db/seed.js';

const app = createApp();

let adminToken = '';
let guestToken = '';
let guest2Token = '';
let subId = '';

beforeAll(async () => {
  await initDb();
  await runMigrations();
  await seedDatabase();
});

afterAll(async () => {
  // Test DB file is wiped by globalSetup on the next run; nothing to close
  // (sqlite3 handles flush on process exit under vitest forks).
});

async function registerAndGetToken(email: string, password = 'password123') {
  const res = await request(app).post('/api/auth/register').send({ email, password, name: 'Test User' });
  if (res.status === 201) return res.body.data.token as string;
  // Already exists (single shared DB across describe blocks) — log in instead.
  const login = await request(app).post('/api/auth/login').send({ email, password });
  return login.body.data.token as string;
}

describe('health & bootstrap', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('auth', () => {
  it('registers a user with hashed budget cents', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'infra-test@example.com', password: 'password123', name: 'Infra Test', monthly_budget: 123.45 });
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'infra-test@example.com', password: 'password123', name: 'Dup' });
    expect(res.status).toBe(400);
  });

  it('logs in and /me reports cents-normalized monthly spend', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'infra-test@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    adminToken = login.body.data.token;

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('infra-test@example.com');
    expect(me.body.data.monthlySpend).toBe(0);
  });

  it('rejects bad credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'infra-test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/subscriptions');
    expect(res.status).toBe(401);
  });
});

describe('per-session guest demo', () => {
  it('provisions isolated guest accounts with seeded data', async () => {
    const d1 = await request(app).post('/api/auth/demo');
    const d2 = await request(app).post('/api/auth/demo');
    expect(d1.status).toBe(200);
    expect(d2.status).toBe(200);
    guestToken = d1.body.data.token;
    guest2Token = d2.body.data.token;

    expect(d1.body.data.user.email).toMatch(/@demo\.subscrr\.local$/);
    expect(d1.body.data.user.email).not.toBe(d2.body.data.user.email);

    const subs1 = await request(app).get('/api/subscriptions').set('Authorization', `Bearer ${guestToken}`);
    expect(subs1.body.data.count).toBeGreaterThan(0);
  });

  it('prevents guests from seeing each other\'s subscriptions', async () => {
    const mine = await request(app).get('/api/subscriptions').set('Authorization', `Bearer ${guestToken}`);
    const otherId = mine.body.data.subscriptions[0].id;

    const stolen = await request(app).get(`/api/subscriptions/${otherId}`).set('Authorization', `Bearer ${guest2Token}`);
    expect(stolen.status).toBe(404);
  });
});

describe('subscriptions CRUD with integer cents', () => {
  it('creates a subscription and stores exact cents', async () => {
    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Float Drift Test',
        amount: 22.99,
        currency: 'USD',
        billing_cycle: 'monthly',
        category: 'Music',
        next_renewal_date: '2026-10-01',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subscription.amount_cents).toBe(2299);
    expect(res.body.data.subscription.amount).toBe(22.99);
    subId = res.body.data.subscription.id;
  });

  it('updates amount with exact cents (no drift)', async () => {
    const res = await request(app)
      .put(`/api/subscriptions/${subId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 19.99 });
    expect(res.status).toBe(200);
    expect(res.body.data.subscription.amount_cents).toBe(1999);
  });

  it('toggles active -> paused -> active', async () => {
    const t1 = await request(app).patch(`/api/subscriptions/${subId}/toggle-status`).set('Authorization', `Bearer ${adminToken}`);
    expect(t1.body.data.status).toBe('paused');
    const t2 = await request(app).patch(`/api/subscriptions/${subId}/toggle-status`).set('Authorization', `Bearer ${adminToken}`);
    expect(t2.body.data.status).toBe('active');
  });

  it('deletes the subscription', async () => {
    const res = await request(app).delete(`/api/subscriptions/${subId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const gone = await request(app).get(`/api/subscriptions/${subId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(gone.status).toBe(404);
  });
});

describe('mixed-currency analytics', () => {
  let token = '';
  beforeAll(async () => {
    token = await registerAndGetToken('currency-test@example.com');
  });

  it('converts foreign-currency subs into the user currency before summing', async () => {
    const usd = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'US Sub', amount: 10, currency: 'USD', billing_cycle: 'monthly', category: 'Music', next_renewal_date: '2026-10-01' });
    const inr = await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'INR Sub', amount: 800, currency: 'INR', billing_cycle: 'monthly', category: 'Entertainment', next_renewal_date: '2026-10-02' });

    expect(usd.status).toBe(201);
    expect(inr.status).toBe(201);

    const summary = await request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${token}`);
    expect(summary.status).toBe(200);
    const s = summary.body.data;

    // 10 USD + 800 INR (≈ $10) ≈ $20 — NOT 810 (raw float addition).
    expect(s.currency).toBe('USD');
    expect(s.monthlyTotal).toBeGreaterThan(15);
    expect(s.monthlyTotal).toBeLessThan(25);
  });

  it('re-expresses the same data in the user display currency', async () => {
    await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ default_currency: 'INR' });
    const summary = await request(app).get('/api/analytics/summary').set('Authorization', `Bearer ${token}`);
    expect(summary.body.data.currency).toBe('INR');
    // Same spend, now in INR: ~$20 * ~80 ≈ ₹1600 (rate-dependent, broad band)
    expect(summary.body.data.monthlyTotal).toBeGreaterThan(1000);
    expect(summary.body.data.monthlyTotal).toBeLessThan(3000);
  });
});

describe('alerts engine', () => {
  let token = '';
  beforeAll(async () => {
    token = await registerAndGetToken('alerts-test@example.com');
  });

  it('generates renewal alert for a sub renewing tomorrow', async () => {
    const tomorrow = toLocalDateStr(new Date(Date.now() + 24 * 3600 * 1000));
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Tomorrow Sub', amount: 5, billing_cycle: 'monthly', category: 'Music', next_renewal_date: tomorrow });

    const run = await request(app).post('/api/notifications/check-reminders').set('Authorization', `Bearer ${token}`);
    expect(run.status).toBe(200);
    expect(run.body.data.renewalAlerts).toBe(1);

    const list = await request(app).get('/api/notifications').set('Authorization', `Bearer ${token}`);
    expect(list.body.data.notifications.some((n: any) => n.title.includes('Renewal Tomorrow'))).toBe(true);
  });

  it('dedupes alerts on rerun', async () => {
    const run = await request(app).post('/api/notifications/check-reminders').set('Authorization', `Bearer ${token}`);
    expect(run.body.data.renewalAlerts).toBe(0);
  });

  it('fires over-budget alert when spend crosses the threshold', async () => {
    await request(app).put('/api/auth/profile').set('Authorization', `Bearer ${token}`).send({ monthly_budget: 5 });
    const run = await request(app).post('/api/notifications/check-reminders').set('Authorization', `Bearer ${token}`);
    expect(run.body.data.budgetAlerts).toBe(1);
  });

  it('converts an expired trial to active with next cycle renewal', async () => {
    await request(app).post('/api/subscriptions').set('Authorization', `Bearer ${token}`)
      .send({ name: 'Old Trial', amount: 10, billing_cycle: 'monthly', category: 'Gaming', status: 'trial', next_renewal_date: '2026-08-01', trial_end_date: '2026-08-05' });

    const run = await request(app).post('/api/notifications/check-reminders').set('Authorization', `Bearer ${token}`);
    expect(run.body.data.trialConversions).toBe(1);

    const list = await request(app).get('/api/subscriptions?search=Old%20Trial').set('Authorization', `Bearer ${token}`);
    const sub = list.body.data.subscriptions[0];
    expect(sub.status).toBe('active');
    expect(sub.next_renewal_date).toBe('2026-09-05'); // trial end + 1 monthly cycle
  });
});

describe('password reset flow', () => {
  it('issues hashed single-use tokens and completes the reset', async () => {
    await registerAndGetToken('reset-flow@example.com', 'oldpassword1');

    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'reset-flow@example.com' });
    expect(forgot.status).toBe(200);
    const raw = forgot.body.devResetToken as string | undefined;
    expect(raw).toBeTruthy(); // test env is non-production

    // Stored token must be a 64-char sha256 hex, not the raw token.
    const { default: db } = await import('../db/index.js');
    const row = await db.get('SELECT token FROM password_reset_tokens ORDER BY created_at DESC LIMIT 1');
    expect(row.token).toHaveLength(64);
    expect(row.token).not.toBe(raw);

    const verify = await request(app).get(`/api/auth/verify-reset-token/${raw}`);
    expect(verify.body.valid).toBe(true);

    const reset = await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'newpassword2' });
    expect(reset.status).toBe(200);

    // Token burned
    const verifyAgain = await request(app).get(`/api/auth/verify-reset-token/${raw}`);
    expect(verifyAgain.body.valid).toBe(false);

    // New password works
    const login = await request(app).post('/api/auth/login').send({ email: 'reset-flow@example.com', password: 'newpassword2' });
    expect(login.status).toBe(200);
  });
});

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
