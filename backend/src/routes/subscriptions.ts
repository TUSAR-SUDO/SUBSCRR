import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { Subscription } from '../types/index.js';
import { advanceRenewals } from '../services/scheduler.js';
import { dollarsToCents, centsToDollars } from '../services/money.js';

const router = Router();

const subscriptionSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Subscription name is required'),
    description: z.string().optional(),
    amount: z.number().positive('Amount must be greater than 0'),
    currency: z.string().optional().default('USD'),
    billing_cycle: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    category: z.string().min(1, 'Category is required'),
    status: z.enum(['active', 'paused', 'cancelled', 'trial']).optional().default('active'),
    next_renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    trial_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
    payment_method: z.string().optional().default('Credit Card'),
    website_url: z.string().optional().nullable(),
    color: z.string().optional().default('#FF2500'),
    icon: z.string().optional().default('Layers'),
    notes: z.string().optional().nullable(),
  }),
});

const updateSubscriptionSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    amount: z.number().positive().optional(),
    currency: z.string().optional(),
    billing_cycle: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).optional(),
    category: z.string().min(1).optional(),
    status: z.enum(['active', 'paused', 'cancelled', 'trial']).optional(),
    next_renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    trial_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    payment_method: z.string().optional(),
    website_url: z.string().optional().nullable(),
    color: z.string().optional(),
    icon: z.string().optional(),
    notes: z.string().optional().nullable(),
  }),
});

// GET /api/subscriptions
// Query params: search, category, status, billing_cycle, sortBy, sortOrder
// Returns amounts as decimal dollars (amount) plus integer cents (amount_cents).
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      search,
      category,
      status,
      billing_cycle,
      sortBy = 'next_renewal_date',
      sortOrder = 'asc',
    } = req.query;

    let query = 'SELECT * FROM subscriptions WHERE user_id = ?';
    const params: any[] = [userId];

    if (search && typeof search === 'string' && search.trim() !== '') {
      query += ' AND (name LIKE ? OR description LIKE ? OR notes LIKE ? OR category LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (category && typeof category === 'string' && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status && typeof status === 'string' && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (billing_cycle && typeof billing_cycle === 'string' && billing_cycle !== 'all') {
      query += ' AND billing_cycle = ?';
      params.push(billing_cycle);
    }

    // Allowed sort columns
    const allowedSorts = ['next_renewal_date', 'amount', 'name', 'created_at', 'category'];
    const safeSort = allowedSorts.includes(sortBy as string) ? (sortBy as string) : 'next_renewal_date';
    const safeOrder = (sortOrder as string)?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    query += ` ORDER BY ${safeSort} ${safeOrder}`;

    const subscriptions = await db.all<Subscription>(query, params);

    // Legacy `amount` column kept in sync for compatibility; amount_cents is
    // the authoritative storage. Ensure the serialized decimals are exact.
    for (const s of subscriptions) {
      s.amount = centsToDollars(s.amount_cents ?? dollarsToCents(s.amount));
    }

    res.json({
      success: true,
      data: {
        subscriptions,
        count: subscriptions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/export/json
router.get('/export/json', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const subscriptions = await db.all<Subscription>('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY name ASC', [userId]);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=subscrr-export-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(subscriptions, null, 2));
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/export/csv
router.get('/export/csv', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const subscriptions = await db.all<Subscription>('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY name ASC', [userId]);

    // CSV formula-injection guard: spreadsheet apps (Excel, Sheets, Numbers)
    // execute cells that begin with = + - @ as formulas. Prefix a single quote
    // so the payload renders inert, and strip control characters.
    const sanitizeCsvCell = (value: unknown): string => {
      let cell = String(value ?? '').replace(/[\u0000-\u0008\u000B-\u001F]/g, '');
      if (/^[=+@\r]/.test(cell) || /^-[^0-9(]/.test(cell) || /^-\s/.test(cell)) {
        cell = `'${cell}`;
      }
      return cell;
    };
    const escapeCsvField = (value: unknown): string => `"${sanitizeCsvCell(value).replace(/"/g, '""')}"`;

    const headers = ['Name', 'Amount', 'Currency', 'Billing Cycle', 'Category', 'Status', 'Next Renewal Date', 'Payment Method', 'Notes'];
    const rows = subscriptions.map((s) => [
      escapeCsvField(s.name),
      escapeCsvField(s.amount),
      escapeCsvField(s.currency),
      escapeCsvField(s.billing_cycle),
      escapeCsvField(s.category),
      escapeCsvField(s.status),
      escapeCsvField(s.next_renewal_date),
      escapeCsvField(s.payment_method || ''),
      escapeCsvField(s.notes || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=subscrr-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

// GET /api/subscriptions/:id
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const subscription = await db.get<Subscription>(
      'SELECT * FROM subscriptions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!subscription) {
      throw new AppError('Subscription not found', 404);
    }

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/subscriptions
router.post('/', authenticateToken, validate(subscriptionSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const body = req.body;
    const id = uuidv4();
    const amountCents = dollarsToCents(body.amount);

    await db.run(
      `INSERT INTO subscriptions (
        id, user_id, name, description, amount, amount_cents, currency, billing_cycle,
        category, status, next_renewal_date, trial_end_date, payment_method,
        website_url, color, icon, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        id,
        userId,
        body.name.trim(),
        body.description || null,
        centsToDollars(amountCents),
        amountCents,
        body.currency || 'USD',
        body.billing_cycle,
        body.category,
        body.status || 'active',
        body.next_renewal_date,
        body.trial_end_date || null,
        body.payment_method || 'Credit Card',
        body.website_url || null,
        body.color || '#FF2500',
        body.icon || 'Layers',
        body.notes || null,
      ]
    );

    // Activity Log
    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, 'CREATED_SUBSCRIPTION', 'subscription', ?, ?, datetime('now'))`,
      [uuidv4(), userId, id, `Added subscription ${body.name} (${body.currency || 'USD'} ${body.amount}/${body.billing_cycle})`]
    );

    const newSub = await db.get<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id]);
    if (newSub) newSub.amount = centsToDollars(newSub.amount_cents ?? dollarsToCents(newSub.amount));

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: { subscription: newSub },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', authenticateToken, validate(updateSubscriptionSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await db.get<Subscription>(
      'SELECT * FROM subscriptions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!existing) {
      throw new AppError('Subscription not found', 404);
    }

    const body = req.body;
    const updated = {
      name: body.name !== undefined ? body.name.trim() : existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      amountCents: body.amount !== undefined ? dollarsToCents(body.amount) : (existing.amount_cents ?? dollarsToCents(existing.amount)),
      currency: body.currency !== undefined ? body.currency : existing.currency,
      billing_cycle: body.billing_cycle !== undefined ? body.billing_cycle : existing.billing_cycle,
      category: body.category !== undefined ? body.category : existing.category,
      status: body.status !== undefined ? body.status : existing.status,
      next_renewal_date: body.next_renewal_date !== undefined ? body.next_renewal_date : existing.next_renewal_date,
      trial_end_date: body.trial_end_date !== undefined ? body.trial_end_date : existing.trial_end_date,
      payment_method: body.payment_method !== undefined ? body.payment_method : existing.payment_method,
      website_url: body.website_url !== undefined ? body.website_url : existing.website_url,
      color: body.color !== undefined ? body.color : existing.color,
      icon: body.icon !== undefined ? body.icon : existing.icon,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    };

    await db.run(
      `UPDATE subscriptions SET
        name = ?, description = ?, amount = ?, amount_cents = ?, currency = ?, billing_cycle = ?,
        category = ?, status = ?, next_renewal_date = ?, trial_end_date = ?,
        payment_method = ?, website_url = ?, color = ?, icon = ?, notes = ?,
        updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
      [
        updated.name,
        updated.description,
        centsToDollars(updated.amountCents),
        updated.amountCents,
        updated.currency,
        updated.billing_cycle,
        updated.category,
        updated.status,
        updated.next_renewal_date,
        updated.trial_end_date,
        updated.payment_method,
        updated.website_url,
        updated.color,
        updated.icon,
        updated.notes,
        id,
        userId,
      ]
    );

    // Activity log
    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, 'UPDATED_SUBSCRIPTION', 'subscription', ?, ?, datetime('now'))`,
      [uuidv4(), userId, id, `Updated subscription ${updated.name}`]
    );

    const saved = await db.get<Subscription>('SELECT * FROM subscriptions WHERE id = ?', [id]);
    if (saved) saved.amount = centsToDollars(saved.amount_cents ?? dollarsToCents(saved.amount));

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { subscription: saved },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/subscriptions/:id/toggle-status
router.patch('/:id/toggle-status', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const sub = await db.get<Subscription>(
      'SELECT * FROM subscriptions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!sub) {
      throw new AppError('Subscription not found', 404);
    }

    const nextStatus = sub.status === 'active' ? 'paused' : 'active';
    await db.run(
      `UPDATE subscriptions SET status = ?, updated_at = datetime('now') WHERE id = ?`,
      [nextStatus, id]
    );

    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, 'TOGGLED_STATUS', 'subscription', ?, ?, datetime('now'))`,
      [uuidv4(), userId, id, `${nextStatus === 'active' ? 'Reactivated' : 'Paused'} ${sub.name}`]
    );

    res.json({
      success: true,
      message: `Subscription is now ${nextStatus}`,
      data: { id, status: nextStatus },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const sub = await db.get<Subscription>(
      'SELECT * FROM subscriptions WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!sub) {
      throw new AppError('Subscription not found', 404);
    }

    await db.run('DELETE FROM subscriptions WHERE id = ? AND user_id = ?', [id, userId]);

    // Clean up related notifications
    await db.run('DELETE FROM notifications WHERE subscription_id = ?', [id]);

    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, 'DELETED_SUBSCRIPTION', 'subscription', ?, ?, datetime('now'))`,
      [uuidv4(), userId, id, `Deleted subscription ${sub.name}`]
    );

    res.json({
      success: true,
      message: 'Subscription deleted successfully',
      data: { id },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/subscriptions/seed-demo (Restores or loads rich demo subscriptions for user)
router.post('/seed-demo', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const today = new Date();
    const addDays = (d: number) => {
      const target = new Date(today);
      target.setDate(today.getDate() + d);
      return target.toISOString().split('T')[0];
    };

    const demoItems = [
      { name: 'ChatGPT Plus', amount: 20.00, cycle: 'monthly', cat: 'AI Tools', date: addDays(1), col: '#10A37F', icon: 'Bot', desc: 'OpenAI GPT-4o & Canvas access' },
      { name: 'Netflix Premium', amount: 22.99, cycle: 'monthly', cat: 'Entertainment', date: addDays(4), col: '#E50914', icon: 'Tv', desc: '4K Ultra HD 4-screens' },
      { name: 'Spotify Duo', amount: 14.99, cycle: 'monthly', cat: 'Music', date: addDays(8), col: '#1DB954', icon: 'Music', desc: 'Premium music streaming' },
      { name: 'GitHub Copilot', amount: 100.00, cycle: 'yearly', cat: 'Development', date: addDays(22), col: '#24292F', icon: 'Code', desc: 'AI code completion for developers' },
      { name: 'Figma Professional', amount: 15.00, cycle: 'monthly', cat: 'Design', date: addDays(12), col: '#F24E1E', icon: 'Figma', desc: 'UI/UX design workspace' },
      { name: 'iCloud+ 2TB', amount: 9.99, cycle: 'monthly', cat: 'Cloud Storage', date: addDays(15), col: '#0071E3', icon: 'Cloud', desc: 'Apple cloud backup & Private Relay' },
      { name: 'Midjourney Pro', amount: 30.00, cycle: 'monthly', cat: 'AI Tools', date: addDays(3), col: '#7289DA', icon: 'Sparkles', desc: 'Generative image generation', status: 'trial' },
      { name: 'Notion Plus', amount: 10.00, cycle: 'monthly', cat: 'Productivity', date: addDays(19), col: '#000000', icon: 'FileText', desc: 'Collaborative wiki & docs' },
    ];

    for (const item of demoItems) {
      const itemCents = dollarsToCents(item.amount);
      await db.run(
        `INSERT INTO subscriptions (
          id, user_id, name, description, amount, amount_cents, currency, billing_cycle,
          category, status, next_renewal_date, payment_method, color, icon, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, 'Apple Pay', ?, ?, datetime('now'), datetime('now'))`,
        [
          uuidv4(),
          userId,
          item.name,
          item.desc,
          itemCents / 100,
          itemCents,
          item.cycle,
          item.cat,
          item.status || 'active',
          item.date,
          item.col,
          item.icon,
        ]
      );
    }

    res.json({
      success: true,
      message: `Added ${demoItems.length} demo subscriptions to your account`,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/subscriptions/advance-renewals
// SECURITY: scoped to the requesting user only — previously this advanced
// renewals for every user on the platform. The global pass belongs to the cron.
router.post('/advance-renewals', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const result = await advanceRenewals(req.user!.id);
    res.json({
      success: true,
      message: `Processed renewals: ${result.processedCount} subscription(s) updated`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

