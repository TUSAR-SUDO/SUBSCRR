import { Router } from 'express';
import db from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { Subscription, AnalyticsSummary } from '../types/index.js';
import { toMonthlyCents, convertCents, categoryColor, centsToDollars } from '../services/money.js';
import { fetchExchangeRates } from '../services/currency.js';
import { daysUntil, parseLocalDate } from '../utils/dates.js';

const router = Router();

// GET /api/analytics/summary
// All aggregation happens in INTEGER CENTS. Every subscription is converted
// from its own currency into the user's default currency BEFORE summing, so
// a $10 sub and a ₹800 sub no longer add up as "810" of nothing.
router.get('/summary', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const userCurrency = (user.default_currency || 'USD').toUpperCase();
    const subs = await db.all<Subscription>('SELECT * FROM subscriptions WHERE user_id = ?', [user.id]);
    const { rates } = await fetchExchangeRates('USD');

    let monthlyTotalCents = 0;
    let activeCount = 0;
    let pausedCount = 0;
    let trialCount = 0;

    const categoryMap: Record<string, { total: number; count: number }> = {};
    const topSpendsList: {
      id: string; name: string; monthlyAmount: number; originalAmount: number;
      currency: string; billing_cycle: string; category: string;
    }[] = [];

    const upcomingList: {
      id: string; name: string; amount: number; currency: string;
      convertedAmount: number; next_renewal_date: string; daysUntil: number;
      category: string; icon?: string; color?: string;
    }[] = [];

    for (const sub of subs) {
      const amountCents = sub.amount_cents ?? Math.round(sub.amount * 100);

      if (sub.status === 'paused') {
        pausedCount++;
        continue;
      }
      if (sub.status === 'cancelled') {
        continue;
      }
      if (sub.status === 'trial') {
        trialCount++;
      } else if (sub.status === 'active') {
        activeCount++;
      }

      const monthlyCents = toMonthlyCents(amountCents, sub.billing_cycle);
      // Convert each subscription into the user's currency before summing.
      const monthlyInUserCents = convertCents(monthlyCents, sub.currency || 'USD', userCurrency, rates);
      monthlyTotalCents += monthlyInUserCents;

      // Category breakdown
      const cat = sub.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, count: 0 };
      }
      categoryMap[cat].total += monthlyInUserCents;
      categoryMap[cat].count += 1;

      // Top spends list (monthly-normalized + converted)
      topSpendsList.push({
        id: sub.id,
        name: sub.name,
        monthlyAmount: centsToDollars(monthlyInUserCents),
        originalAmount: centsToDollars(amountCents),
        currency: sub.currency || 'USD',
        billing_cycle: sub.billing_cycle,
        category: sub.category,
      });

      // Upcoming renewals calculation (timezone-safe day diff)
      if (sub.next_renewal_date) {
        const d = daysUntil(sub.next_renewal_date);

        if (d >= 0 && d <= 60) {
          upcomingList.push({
            id: sub.id,
            name: sub.name,
            amount: centsToDollars(amountCents),
            currency: sub.currency || 'USD',
            convertedAmount: centsToDollars(convertCents(amountCents, sub.currency || 'USD', userCurrency, rates)),
            next_renewal_date: sub.next_renewal_date,
            daysUntil: d,
            category: sub.category,
            icon: sub.icon,
            color: sub.color,
          });
        }
      }
    }

    // Sort upcoming renewals nearest first
    upcomingList.sort((a, b) => a.daysUntil - b.daysUntil);

    // Sort top spends highest first
    topSpendsList.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    // Format category distribution
    const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => {
      const percentage = monthlyTotalCents > 0 ? Number(((data.total / monthlyTotalCents) * 100).toFixed(1)) : 0;
      return {
        category,
        monthlyAmount: centsToDollars(data.total),
        percentage,
        count: data.count,
        color: categoryColor(category),
      };
    });

    categoryBreakdown.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    const yearlyTotalCents = monthlyTotalCents * 12;
    const dailyBurnCents = Math.round(monthlyTotalCents / 30.416);
    const monthlyBudgetCents = user.monthly_budget_cents ?? Math.round((user.monthly_budget || 0) * 100);
    const budgetUtilizationPct = monthlyBudgetCents > 0
      ? Number(((monthlyTotalCents / monthlyBudgetCents) * 100).toFixed(1))
      : 0;

    const summary: AnalyticsSummary = {
      monthlyTotal: centsToDollars(monthlyTotalCents),
      yearlyTotal: centsToDollars(yearlyTotalCents),
      dailyBurn: centsToDollars(dailyBurnCents),
      activeCount,
      pausedCount,
      trialCount,
      currency: userCurrency,
      monthlyBudget: centsToDollars(monthlyBudgetCents),
      budgetUtilizationPct,
      categoryBreakdown,
      upcomingRenewals: upcomingList.slice(0, 8),
      topSpends: topSpendsList.slice(0, 5),
    };

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/analytics/projections (12-Month Forecast)
router.get('/projections', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = req.user!;
    const userCurrency = (user.default_currency || 'USD').toUpperCase();
    const subs = await db.all<Subscription>(
      "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trial')",
      [user.id]
    );
    const { rates } = await fetchExchangeRates('USD');

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();

    const projections = [];
    let cumulative = 0;

    const monthsFromRenewal = (renewalDate: Date, target: Date): number =>
      (target.getFullYear() - renewalDate.getFullYear()) * 12 + (target.getMonth() - renewalDate.getMonth());

    for (let i = 0; i < 12; i++) {
      const targetMonthIdx = (currentMonthIdx + i) % 12;
      const monthName = months[targetMonthIdx];
      const yearOffset = Math.floor((currentMonthIdx + i) / 12);
      const targetYear = new Date().getFullYear() + yearOffset;

      let monthSpendCents = 0;
      for (const s of subs) {
        const amountCents = s.amount_cents ?? Math.round(s.amount * 100);

        if (s.billing_cycle === 'monthly') {
          monthSpendCents += convertCents(amountCents, s.currency, userCurrency, rates);
        } else if (s.billing_cycle === 'yearly') {
          // Charges every 12 months from the renewal date; months BEFORE the
          // first renewal never charge (diff >= 0 guards negative modulo).
          const renewalDate = parseLocalDate(s.next_renewal_date);
          const diff = monthsFromRenewal(renewalDate, new Date(targetYear, targetMonthIdx, 1));
          if (diff >= 0 && diff % 12 === 0) {
            monthSpendCents += convertCents(amountCents, s.currency, userCurrency, rates);
          }
        } else if (s.billing_cycle === 'quarterly') {
          // Charges every 3 months from the renewal date; negative diffs excluded.
          const renewalDate = parseLocalDate(s.next_renewal_date);
          const diff = monthsFromRenewal(renewalDate, new Date(targetYear, targetMonthIdx, 1));
          if (diff >= 0 && diff % 3 === 0) {
            monthSpendCents += convertCents(amountCents, s.currency, userCurrency, rates);
          }
        } else if (s.billing_cycle === 'weekly') {
          monthSpendCents += convertCents(
            Math.round(amountCents * 4.333), s.currency, userCurrency, rates
          );
        } else if (s.billing_cycle === 'daily') {
          monthSpendCents += convertCents(
            Math.round(amountCents * 30), s.currency, userCurrency, rates
          );
        }
      }

      cumulative += monthSpendCents;
      projections.push({
        month: `${monthName} ${targetYear}`,
        shortMonth: monthName,
        year: targetYear,
        estimatedSpend: centsToDollars(monthSpendCents),
        cumulativeSpend: centsToDollars(cumulative),
      });
    }

    res.json({
      success: true,
      data: {
        currency: userCurrency,
        projections,
        averageMonthly: centsToDollars(Math.round(cumulative / 12)),
        totalProjectedAnnual: centsToDollars(cumulative),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
