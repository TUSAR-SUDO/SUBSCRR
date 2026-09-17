import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import crypto from 'crypto';
import db from '../db/index.js';
import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { User } from '../types/index.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.js';
import { dollarsToCents } from '../services/money.js';

const router = Router();

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain a letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    default_currency: z.string().optional().default('USD'),
    monthly_budget: z.number().optional().default(0),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    default_currency: z.string().min(1).optional(),
    monthly_budget: z.number().min(0).optional(),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain a letter')
      .regex(/[0-9]/, 'Password must contain a number'),
  }),
});


// Helper to generate JWT token — HS256 pinned so verify-side can never be
// downgraded to alg=none by a crafted token.
function generateToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });
}

// ---------------------------------------------------------------------------
// Per-account login lockout: brute-forcing one victim's password must not be
// possible just by rotating IPs. We track consecutive FAILED attempts per
// account; 5 failures locks the account out of *successful* logins for a
// cool-off window. Correct password + locked => 423 with retry time. The
// counter clears on success and on cool-off expiry. In-memory is fine for a
// single-node deployment; move to Redis when the API runs multi-instance.
// ---------------------------------------------------------------------------
const LOCKOUT_MAX_FAILURES = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface LoginFailure { count: number; lastFailureAt: number; lockedUntil: number }
const loginFailures = new Map<string, LoginFailure>();

function getLoginFailure(email: string): LoginFailure | undefined {
  const entry = loginFailures.get(email);
  if (!entry) return undefined;
  // Expired entries self-clean lazily.
  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    loginFailures.delete(email);
    return undefined;
  }
  if (!entry.lockedUntil && now - entry.lastFailureAt > LOCKOUT_WINDOW_MS) {
    loginFailures.delete(email);
    return undefined;
  }
  return entry;
}

function recordLoginFailure(email: string): LoginFailure {
  const now = Date.now();
  const entry = getLoginFailure(email) ?? { count: 0, lastFailureAt: now, lockedUntil: 0 };
  entry.count += 1;
  entry.lastFailureAt = now;
  if (entry.count >= LOCKOUT_MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }
  loginFailures.set(email, entry);
  return entry;
}

function clearLoginFailures(email: string): void {
  loginFailures.delete(email);
}

function isLocked(entry: LoginFailure, now = Date.now()): boolean {
  return entry.lockedUntil > now;
}

// Reset tokens are stored hashed (SHA-256); the raw token only ever lives in the email link.
function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

// Housekeeping for per-session guest demo accounts.
// Demo users are identified by their @demo.subscrr.local email domain and
// deleted (with cascading subscriptions/notifications) after 24 hours.
const DEMO_EMAIL_DOMAIN = '@demo.subscrr.local';
const DEMO_TTL_HOURS = 24;

async function purgeExpiredDemoUsers(): Promise<number> {
  const result = await db.run(
    `DELETE FROM users
     WHERE email LIKE ?
       AND datetime(created_at) < datetime('now', ?)`,
    [`%${DEMO_EMAIL_DOMAIN}`, `-${DEMO_TTL_HOURS} hours`]
  );
  return result.changes;
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, default_currency = 'USD', monthly_budget = 0 } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await db.get<User>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      throw new AppError('An account with this email already exists', 400);
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const budgetCents = dollarsToCents(monthly_budget);

    await db.run(
      `INSERT INTO users (id, email, password_hash, name, role, default_currency, monthly_budget, monthly_budget_cents, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'user', ?, ?, ?, datetime('now'), datetime('now'))`,
      [userId, normalizedEmail, passwordHash, name.trim(), default_currency, budgetCents / 100, budgetCents]
    );

    // Initial welcome notification
    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, 'Welcome to Subscrr!', 'Start tracking your subscriptions, scan receipts with AI, and take control of your recurring expenses.', 'system', 0, datetime('now'))`,
      [uuidv4(), userId]
    );

    // Welcome email — strictly after the account exists; never blocks registration.
    // Skipped for guest demo accounts (@demo.subscrr.local).
    if (!normalizedEmail.endsWith('@demo.subscrr.local')) {
      sendWelcomeEmail({
        to: normalizedEmail,
        name: name.trim(),
        dashboardUrl: `${config.frontendUrl}/dashboard`,
      }).catch((err) => console.error('[auth] welcome email failed:', err));
    }

    const token = generateToken(userId);
    const user = await db.get<User>(
      'SELECT id, email, name, role, default_currency, monthly_budget, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Per-account lockout check (also covers unknown accounts' timing? No —
    // we only track real accounts; unknown-email logins are already 401s.)
    const failure = getLoginFailure(normalizedEmail);
    if (failure && isLocked(failure)) {
      const retrySec = Math.ceil((failure.lockedUntil - Date.now()) / 1000);
      throw new AppError(
        `Too many failed attempts for this account. Try again in ${Math.ceil(retrySec / 60)} minute(s).`,
        423
      );
    }

    const user = await db.get<User>('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const entry = recordLoginFailure(normalizedEmail);
      const remaining = Math.max(0, LOCKOUT_MAX_FAILURES - entry.count);
      throw new AppError(
        remaining > 0
          ? `Invalid email or password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before temporary lock.`
        : 'Invalid email or password.',
        401
      );
    }

    clearLoginFailures(normalizedEmail);
    const token = generateToken(user.id);
    const { password_hash, ...userProfile } = user;

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: { user: userProfile, token },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/demo (1-click Guest Demo Login)
// SECURITY: every call provisions an ISOLATED per-session demo user so guests
// can never see or mutate each other's data. Accounts are garbage-collected
// after 24h by purgeExpiredDemoUsers().
router.post('/demo', async (req, res, next) => {
  try {
    // Opportunistic cleanup of stale guest accounts (cheap indexed-enough delete).
    purgeExpiredDemoUsers().catch((err) =>
      console.error('Demo user cleanup failed:', err)
    );

    const demoUserId = uuidv4();
    const guestSlug = uuidv4().split('-')[0];
    const demoEmail = `guest-${guestSlug}${DEMO_EMAIL_DOMAIN}`;
    // Random per-account password: the account is only reachable via the JWT we hand out.
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    await db.run(
      `INSERT INTO users (id, email, password_hash, name, role, default_currency, monthly_budget, created_at, updated_at)
       VALUES (?, ?, ?, 'Guest Demo', 'user', 'USD', 250.00, datetime('now'), datetime('now'))`,
      [demoUserId, demoEmail, passwordHash]
    );

    // Seed the guest with sample subscriptions so the demo has realistic data.
    const addDays = (d: number) => {
      const target = new Date();
      target.setDate(target.getDate() + d);
      return target.toISOString().split('T')[0];
    };
    const demoItems = [
      { name: 'ChatGPT Plus', amount: 20.0, cycle: 'monthly', cat: 'AI Tools', date: addDays(1), col: '#10A37F', icon: 'Bot', desc: 'OpenAI GPT-4o & Canvas access' },
      { name: 'Netflix Premium', amount: 22.99, cycle: 'monthly', cat: 'Entertainment', date: addDays(4), col: '#E50914', icon: 'Tv', desc: '4K Ultra HD 4-screens' },
      { name: 'Spotify Duo', amount: 14.99, cycle: 'monthly', cat: 'Music', date: addDays(8), col: '#1DB954', icon: 'Music', desc: 'Premium music streaming' },
      { name: 'GitHub Copilot', amount: 100.0, cycle: 'yearly', cat: 'Development', date: addDays(22), col: '#24292F', icon: 'Code', desc: 'AI code completion for developers' },
      { name: 'Figma Professional', amount: 15.0, cycle: 'monthly', cat: 'Design', date: addDays(12), col: '#F24E1E', icon: 'Figma', desc: 'UI/UX design workspace' },
      { name: 'iCloud+ 2TB', amount: 9.99, cycle: 'monthly', cat: 'Cloud Storage', date: addDays(15), col: '#0071E3', icon: 'Cloud', desc: 'Apple cloud backup & Private Relay' },
      { name: 'Midjourney Pro', amount: 30.0, cycle: 'monthly', cat: 'AI Tools', date: addDays(3), col: '#7289DA', icon: 'Sparkles', desc: 'Generative image generation', status: 'trial' },
      { name: 'Notion Plus', amount: 10.0, cycle: 'monthly', cat: 'Productivity', date: addDays(19), col: '#000000', icon: 'FileText', desc: 'Collaborative wiki & docs' },
    ];

    for (const item of demoItems) {
      const itemCents = dollarsToCents(item.amount);
      await db.run(
        `INSERT INTO subscriptions (
          id, user_id, name, description, amount, amount_cents, currency, billing_cycle,
          category, status, next_renewal_date, payment_method, color, icon, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, 'Apple Pay', ?, ?, datetime('now'), datetime('now'))`,
        [uuidv4(), demoUserId, item.name, item.desc, itemCents / 100, itemCents, item.cycle, item.cat, item.status || 'active', item.date, item.col, item.icon]
      );
    }

    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
       VALUES (?, ?, 'Welcome to Subscrr!', 'You are in a private demo session with sample data. Sign up to keep your data.', 'system', 0, datetime('now'))`,
      [uuidv4(), demoUserId]
    );

    const demoUser = await db.get<User>('SELECT * FROM users WHERE id = ?', [demoUserId]);
    const token = generateToken(demoUser!.id);
    const { password_hash, ...userProfile } = demoUser!;

    res.json({
      success: true,
      message: 'Demo session started (private guest account)',
      data: { user: userProfile, token },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const stats = await db.get<{ activeCount: number; totalMonthlyCents: number }>(
      `SELECT COUNT(id) as activeCount,
              COALESCE(SUM(CASE
                WHEN billing_cycle = 'monthly' THEN amount_cents
                WHEN billing_cycle = 'yearly' THEN CAST(amount_cents / 12.0 AS INTEGER)
                WHEN billing_cycle = 'weekly' THEN CAST(amount_cents * 4.333 AS INTEGER)
                WHEN billing_cycle = 'daily' THEN CAST(amount_cents * 30.416 AS INTEGER)
                WHEN billing_cycle = 'quarterly' THEN CAST(amount_cents / 3.0 AS INTEGER)
                ELSE amount_cents
              END), 0) as totalMonthlyCents
       FROM subscriptions
       WHERE user_id = ? AND status = 'active'`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user,
        activeSubscriptionsCount: stats?.activeCount || 0,
        monthlySpend: (stats?.totalMonthlyCents || 0) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, validate(updateProfileSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const { name, default_currency, monthly_budget } = req.body;

    const updatedName = name !== undefined ? name.trim() : user.name;
    const updatedCurrency = default_currency !== undefined ? default_currency : user.default_currency;
    const updatedBudgetCents = monthly_budget !== undefined ? dollarsToCents(monthly_budget) : (user.monthly_budget_cents ?? dollarsToCents(user.monthly_budget));

    await db.run(
      `UPDATE users
       SET name = ?, default_currency = ?, monthly_budget = ?, monthly_budget_cents = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [updatedName, updatedCurrency, updatedBudgetCents / 100, updatedBudgetCents, user.id]
    );

    const updatedUser = await db.get<User>(
      'SELECT id, email, name, role, default_currency, monthly_budget, monthly_budget_cents, created_at, updated_at FROM users WHERE id = ?',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.get<User>('SELECT id, email, name FROM users WHERE email = ?', [normalizedEmail]);

    // To prevent email enumeration attacks, always respond with success
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with that email, a password reset link has been dispatched.',
      });
    }

    // Generate secure random token; only its SHA-256 hash is persisted.
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const tokenId = uuidv4();
    // Token valid for 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.run(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, 0, datetime('now'))`,
      [tokenId, user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${config.frontendUrl}/reset-password?token=${rawToken}`;
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been dispatched.',
      // Provide preview URL or dev token in non-production for instant convenience
      ...(config.nodeEnv !== 'production' && {
        devResetToken: rawToken,
        previewUrl: emailResult.previewUrl,
        resetUrl,
        // Let the UI distinguish "really sent via SMTP/Resend" from
        // "dev mock" so it never claims an email was mocked when it wasn't.
        emailTransport: emailResult.provider,
        emailDelivered: emailResult.success,
      })
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/verify-reset-token/:token
router.get('/verify-reset-token/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const record = await db.get<{
      id: string;
      user_id: string;
      token: string;
      expires_at: string;
      used: number;
    }>(
      'SELECT id, user_id, token, expires_at, used FROM password_reset_tokens WHERE token = ?',
      [hashResetToken(token)]
    );

    if (!record || record.used === 1 || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    res.json({
      success: true,
      valid: true,
      message: 'Token is valid',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Tokens are stored hashed; look up by SHA-256 of the presented raw token.
    const record = await db.get<{
      id: string;
      user_id: string;
      token: string;
      expires_at: string;
      used: number;
    }>(
      'SELECT id, user_id, token, expires_at, used FROM password_reset_tokens WHERE token = ?',
      [hashResetToken(token)]
    );

    if (!record || record.used === 1 || new Date(record.expires_at) < new Date()) {
      throw new AppError('Reset link is invalid or has expired. Please request a new one.', 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(password, 10);

    // Update password in users table
    await db.run(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
      [newPasswordHash, record.user_id]
    );

    // Single-use: burn this token AND any other outstanding tokens for the user
    // (prevents replay of older reset links after a successful reset).
    await db.run(
      `DELETE FROM password_reset_tokens WHERE user_id = ?`,
      [record.user_id]
    );

    // Log security activity
    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, 'password_reset', 'user', ?, 'Password was reset via secure email token', datetime('now'))`,
      [uuidv4(), record.user_id, record.user_id]
    );

    res.json({
      success: true,
      message: 'Password has been successfully updated. You can now log in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

