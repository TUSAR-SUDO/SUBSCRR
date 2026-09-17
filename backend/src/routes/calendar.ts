import { Router } from 'express';
import db from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { Subscription } from '../types/index.js';
import { parseLocalDate, daysInMonth } from '../utils/dates.js';
import { convertCents, centsToDollars } from '../services/money.js';
import { fetchExchangeRates } from '../services/currency.js';

const router = Router();

// GET /api/calendar
// Query params: month (1-12), year (e.g. 2026)
// Amounts are converted to the user's default currency; original amounts
// and currencies are preserved per item.
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const now = new Date();
    const userCurrency = (user.default_currency || 'USD').toUpperCase();
    const queryMonth = parseInt((req.query.month as string) || (now.getMonth() + 1).toString(), 10);
    const queryYear = parseInt((req.query.year as string) || now.getFullYear().toString(), 10);

    const subs = await db.all<Subscription>(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trial')",
      [user.id]
    );
    const { rates } = await fetchExchangeRates('USD');

    const totalDays = daysInMonth(queryYear, queryMonth);
    const daysMap: Record<number, { day: number; date: string; totalAmount: number; items: any[] }> = {};

    for (let d = 1; d <= totalDays; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const monthStr = queryMonth.toString().padStart(2, '0');
      daysMap[d] = {
        day: d,
        date: `${queryYear}-${monthStr}-${dayStr}`,
        totalAmount: 0,
        items: [],
      };
    }

    let totalMonthSpend = 0;

    const addItem = (sub: Subscription, day: number) => {
      const bucket = daysMap[day];
      if (!bucket) return;
      const amountCents = sub.amount_cents ?? Math.round(sub.amount * 100);
      const convertedCents = convertCents(amountCents, sub.currency || 'USD', userCurrency, rates);
      bucket.items.push({
        id: sub.id,
        name: sub.name,
        amount: centsToDollars(amountCents),
        currency: sub.currency || 'USD',
        convertedAmount: centsToDollars(convertedCents),
        category: sub.category,
        icon: sub.icon,
        color: sub.color,
        billing_cycle: sub.billing_cycle,
      });
      bucket.totalAmount += convertedCents;
      totalMonthSpend += convertedCents;
    };

    // First day of the target month at local midnight (timezone-safe anchor).
    const monthStart = new Date(queryYear, queryMonth - 1, 1);
    const monthEnd = new Date(queryYear, queryMonth, 1);

    for (const sub of subs) {
      if (!sub.next_renewal_date) continue;
      const subDate = parseLocalDate(sub.next_renewal_date);
      const subDay = subDate.getDate();

      if (sub.billing_cycle === 'monthly') {
        // Monthly subs charge every month, clamped to the month's length
        // (a Jan-31 renewal shows on Feb 28 in February).
        addItem(sub, Math.min(subDay, totalDays));
      } else if (sub.billing_cycle === 'yearly' || sub.billing_cycle === 'quarterly') {
        // Charges recur every N months from the renewal date. Walk the cycle
        // forward from the sub's date until we reach/overlap the target month.
        const cycleMonths = sub.billing_cycle === 'yearly' ? 12 : 3;
        let cursor = new Date(subDate.getFullYear(), subDate.getMonth(), 1);
        // Step back to the first cycle occurrence at or before the target month.
        while (cursor > monthStart) {
          cursor.setMonth(cursor.getMonth() - cycleMonths);
        }
        // Step forward, checking each occurrence's overlap with the target month.
        while (cursor < monthEnd) {
          const occurrenceDay = Math.min(subDay, daysInMonth(cursor.getFullYear(), cursor.getMonth() + 1));
          const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), occurrenceDay);
          // Skip occurrences strictly before this month (they belong to prior months),
          // but allow a quarterly/yearly charge from a prior month edge-case only if
          // it lands exactly on a day of this month — impossible by construction.
          if (occurrence >= monthStart && occurrence < monthEnd) {
            addItem(sub, occurrence.getDate());
          }
          cursor.setMonth(cursor.getMonth() + cycleMonths);
        }
      } else if (sub.billing_cycle === 'weekly') {
        // Repeat every 7 days from the reference date (timezone-safe).
        for (let d = 1; d <= totalDays; d++) {
          const checkDate = new Date(queryYear, queryMonth - 1, d);
          const diffDays = Math.round((checkDate.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays % 7 === 0) {
            addItem(sub, d);
          }
        }
      } else if (sub.billing_cycle === 'daily') {
        // Daily subs charge every day of the month.
        for (let d = 1; d <= totalDays; d++) {
          addItem(sub, d);
        }
      }
    }

    const calendarDays = Object.values(daysMap).map((d) => ({
      ...d,
      totalAmount: centsToDollars(d.totalAmount),
    }));

    res.json({
      success: true,
      data: {
        month: queryMonth,
        year: queryYear,
        currency: userCurrency,
        totalMonthSpend: centsToDollars(totalMonthSpend),
        days: calendarDays,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
