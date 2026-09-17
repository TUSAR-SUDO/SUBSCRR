import { Router } from 'express';
import db from '../db/index.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { convertCents } from '../services/money.js';
import { fetchExchangeRates } from '../services/currency.js';

const router = Router();

// GET /api/admin/stats
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const totalUsers = await db.get<{ count: number }>('SELECT COUNT(id) as count FROM users');
    const totalSubs = await db.get<{ count: number }>('SELECT COUNT(id) as count FROM subscriptions');
    const activeSubs = await db.get<{ count: number }>('SELECT COUNT(id) as count FROM subscriptions WHERE status = "active"');
    const totalLeads = await db.get<{ count: number }>('SELECT COUNT(id) as count FROM leads');

    // Platform MRC in USD cents, per-currency sums converted before folding.
    const { rates } = await fetchExchangeRates('USD');
    const mrcByCurrency = await db.all<{ currency: string; mrc_cents: number }>(`
      SELECT currency,
             COALESCE(SUM(CASE
               WHEN billing_cycle = 'monthly' THEN amount_cents
               WHEN billing_cycle = 'yearly' THEN CAST(amount_cents / 12.0 AS INTEGER)
               WHEN billing_cycle = 'weekly' THEN CAST(amount_cents * 4.333 AS INTEGER)
               WHEN billing_cycle = 'daily' THEN CAST(amount_cents * 30.416 AS INTEGER)
               WHEN billing_cycle = 'quarterly' THEN CAST(amount_cents / 3.0 AS INTEGER)
               ELSE amount_cents
             END), 0) as mrc_cents
      FROM subscriptions
      WHERE status = 'active'
      GROUP BY currency
    `);
    let mrcUsdCents = 0;
    for (const row of mrcByCurrency) {
      mrcUsdCents += convertCents(row.mrc_cents || 0, row.currency || 'USD', 'USD', rates);
    }
    const totalPlatformMRC = { mrc: mrcUsdCents };

    // Monthly-normalized integer-cent totals per category, converted to USD
    // (platform-level view). The old version summed raw float amounts,
    // mixing $15/mo with $100/yr as if equivalent.
    const topCategoriesRaw = await db.all(`
      SELECT category, currency,
             COUNT(id) as count,
             SUM(CASE
               WHEN billing_cycle = 'monthly' THEN amount_cents
               WHEN billing_cycle = 'yearly' THEN CAST(amount_cents / 12.0 AS INTEGER)
               WHEN billing_cycle = 'weekly' THEN CAST(amount_cents * 4.333 AS INTEGER)
               WHEN billing_cycle = 'daily' THEN CAST(amount_cents * 30.416 AS INTEGER)
               WHEN billing_cycle = 'quarterly' THEN CAST(amount_cents / 3.0 AS INTEGER)
               ELSE amount_cents
             END) as monthly_cents
      FROM subscriptions
      WHERE status IN ('active', 'trial')
      GROUP BY category, currency
    `);

    // Fold per-(category, currency) sums into per-category USD totals.
    const categoryTotals: Record<string, { count: number; monthlyCentsUsd: number }> = {};
    for (const row of topCategoriesRaw as { category: string; currency: string; count: number; monthly_cents: number }[]) {
      if (!categoryTotals[row.category]) {
        categoryTotals[row.category] = { count: 0, monthlyCentsUsd: 0 };
      }
      categoryTotals[row.category].count += row.count;
      categoryTotals[row.category].monthlyCentsUsd += convertCents(
        row.monthly_cents || 0,
        row.currency || 'USD',
        'USD',
        rates
      );
    }

    const topCategories = Object.entries(categoryTotals)
      .map(([category, data]) => ({
        category,
        count: data.count,
        total: data.monthlyCentsUsd / 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers?.count || 0,
        totalSubscriptions: totalSubs?.count || 0,
        activeSubscriptions: activeSubs?.count || 0,
        totalLeads: totalLeads?.count || 0,
        totalPlatformMRC: totalPlatformMRC.mrc / 100,
        topCategories,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const users = await db.all(`
      SELECT u.id, u.email, u.name, u.role, u.default_currency, u.monthly_budget, u.created_at,
             COUNT(s.id) as subscription_count
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
