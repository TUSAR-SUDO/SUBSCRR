import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { Subscription, EmailPreferences } from '../types/index.js';
import { toMonthlyCents, convertCents, centsToDollars } from './money.js';
import { fetchExchangeRates } from './currency.js';
import { daysUntil, addCycle, toLocalDateStr } from '../utils/dates.js';
import { sendAlertEmail } from './email.js';
import { config } from '../config.js';

export interface AlertsResult {
  renewalAlerts: number;
  trialAlerts: number;
  budgetAlerts: number;
  trialConversions: number;
  emailsSent?: number;
}

const DEFAULT_EMAIL_PREFS: Required<EmailPreferences> = {
  renewalAlerts: true,
  trialAlerts: true,
  budgetAlerts: true,
};

function readEmailPrefs(raw: string | EmailPreferences | null | undefined): Required<EmailPreferences> {
  if (!raw) return { ...DEFAULT_EMAIL_PREFS };
  try {
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as EmailPreferences) : raw;
    return {
      renewalAlerts: parsed.renewalAlerts ?? true,
      trialAlerts: parsed.trialAlerts ?? true,
      budgetAlerts: parsed.budgetAlerts ?? true,
    };
  } catch {
    return { ...DEFAULT_EMAIL_PREFS };
  }
}

/**
 * Fire the matching alert email for a freshly-created in-app notification.
 * Best-effort: failures are logged and never break alert generation.
 */
async function sendAlertEmailIfEnabled(
  recipient: { email: string; name: string },
  prefs: Required<EmailPreferences>,
  kind: 'renewal' | 'trial' | 'budget',
  title: string,
  message: string
): Promise<boolean> {
  if (!prefs[kind === 'renewal' ? 'renewalAlerts' : kind === 'trial' ? 'trialAlerts' : 'budgetAlerts']) {
    return false;
  }
  try {
    const result = await sendAlertEmail({
      to: recipient.email,
      name: recipient.name,
      kind,
      title,
      message,
      dashboardUrl: config.frontendUrl,
    });
    if (!result.success) {
      console.warn(`[Alerts] Alert email not delivered to ${recipient.email} (${result.provider}): ${result.error}`);
    }
    return result.success;
  } catch (err) {
    console.error(`[Alerts] Alert email failed for ${recipient.email}:`, err);
    return false;
  }
}

async function insertNotification(
  userId: string,
  title: string,
  message: string,
  type: 'renewal' | 'trial_ending' | 'budget_alert' | 'price_change' | 'system',
  renewalDate: string | null,
  subscriptionId: string | null
): Promise<boolean> {
  // Dedupe: same user + subscription + type + target date never inserts twice.
  const existing = await db.get(
    `SELECT id FROM notifications
     WHERE user_id = ? AND type = ? AND IFNULL(renewal_date, '') = IFNULL(?, '')
       AND IFNULL(subscription_id, '') = IFNULL(?, '')`,
    [userId, type, renewalDate, subscriptionId]
  );
  if (existing) return false;

  await db.run(
    `INSERT INTO notifications (id, user_id, title, message, type, is_read, renewal_date, subscription_id, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, datetime('now'))`,
    [uuidv4(), userId, title, message, type, renewalDate, subscriptionId]
  );
  return true;
}

/**
 * Generate all alert types for a user's subscriptions:
 *  - Renewal nudges at 3 days and 1 day before next_renewal_date
 *  - Trial expiry warnings keyed on trial_end_date (NOT next_renewal_date)
 *  - Budget threshold alerts at >= 80% and >= 100% of monthly budget
 * Also converts expired trials to active status (the trial has ended; charging begins).
 */
export async function generateAlertsForUser(
  userId: string,
  user?: {
    monthly_budget?: number;
    monthly_budget_cents?: number;
    email?: string;
    name?: string;
    /** Raw column value is a JSON string; callers may pass a parsed object. */
    email_preferences?: string | EmailPreferences | null;
  }
): Promise<AlertsResult> {
  const subs = await db.all<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trial')",
    [userId]
  );

  const result: AlertsResult = { renewalAlerts: 0, trialAlerts: 0, budgetAlerts: 0, trialConversions: 0, emailsSent: 0 };

  // Email channel: only when we know the recipient's address.
  const recipient = user?.email ? { email: user.email, name: user.name ?? 'there' } : null;
  const prefs = readEmailPrefs(user?.email_preferences);

  const { rates } = await fetchExchangeRates('USD');
  const userCurrency = 'USD'; // alert messages are platform-locale; amounts below are per-sub currency

  let monthlyTotalCents = 0;
  for (const sub of subs) {
    if (sub.status === 'active') {
      monthlyTotalCents += convertCents(
        toMonthlyCents(sub.amount_cents ?? Math.round(sub.amount * 100), sub.billing_cycle),
        sub.currency || 'USD',
        userCurrency,
        rates
      );
    }
  }

  const fmt = (cents: number, currency: string) =>
    `${currency} ${centsToDollars(cents).toFixed(2)}`;

  for (const sub of subs) {
    const amountCents = sub.amount_cents ?? Math.round(sub.amount * 100);
    // ---- Renewal nudges (active + trial both charge eventually) ----
    if (sub.next_renewal_date) {
      const d = daysUntil(sub.next_renewal_date);

      if (d === 3) {
        const title = `Upcoming Renewal: ${sub.name}`;
        const message = `${sub.name} renews in 3 days (${sub.next_renewal_date}) for ${fmt(amountCents, sub.currency || 'USD')} via ${sub.payment_method || 'your card'}.`;
        const created = await insertNotification(
          sub.user_id,
          title,
          message,
          'renewal',
          sub.next_renewal_date,
          sub.id
        );
        if (created) {
          result.renewalAlerts++;
          if (recipient && (await sendAlertEmailIfEnabled(recipient, prefs, 'renewal', title, message))) {
            result.emailsSent!++;
          }
        }
      }

      if (d === 1) {
        const title = `Renewal Tomorrow: ${sub.name}`;
        const message = `${sub.name} is scheduled to renew tomorrow for ${fmt(amountCents, sub.currency || 'USD')} via ${sub.payment_method || 'your card'}.`;
        const created = await insertNotification(
          sub.user_id,
          title,
          message,
          'renewal',
          sub.next_renewal_date,
          sub.id
        );
        if (created) {
          result.renewalAlerts++;
          if (recipient && (await sendAlertEmailIfEnabled(recipient, prefs, 'renewal', title, message))) {
            result.emailsSent!++;
          }
        }
      }
    }

    // ---- Trial expiry — keyed on trial_end_date (the actual trial end) ----
    if (sub.status === 'trial' && sub.trial_end_date) {
      const d = daysUntil(sub.trial_end_date);

      if (d >= 0 && d <= 3) {
        const title = `Free Trial Ending Soon: ${sub.name}`;
        const message = `Your trial for ${sub.name} ends ${d === 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`} (${sub.trial_end_date}). Next charge will be ${fmt(amountCents, sub.currency || 'USD')}.`;
        const created = await insertNotification(
          sub.user_id,
          title,
          message,
          'trial_ending',
          sub.trial_end_date,
          sub.id
        );
        if (created) {
          result.trialAlerts++;
          if (recipient && (await sendAlertEmailIfEnabled(recipient, prefs, 'trial', title, message))) {
            result.emailsSent!++;
          }
        }
      }

      // Trial conversion: trial ended on/before today -> flip to active so the
      // renewal engine takes over and analytics count the spend.
      if (d < 0) {
        const nextRenewal = sub.next_renewal_date && daysUntil(sub.next_renewal_date) < 0
          ? addCycle(sub.trial_end_date, sub.billing_cycle)
          : sub.next_renewal_date || addCycle(sub.trial_end_date, sub.billing_cycle);

        await db.run(
          `UPDATE subscriptions SET status = 'active', next_renewal_date = ?, updated_at = datetime('now') WHERE id = ?`,
          [nextRenewal, sub.id]
        );
        result.trialConversions++;
      }
    }
  }

  // ---- Budget threshold alerts (informational; no subscription attached) ----
  // Budget comes from the user record in USD cents (per-user display currency
  // is a frontend concern; thresholds compare in the user's own baseline).
  const budgetCents = user?.monthly_budget_cents ?? Math.round((user?.monthly_budget || 0) * 100);
  if (budgetCents > 0 && monthlyTotalCents > 0) {
    const pct = (monthlyTotalCents / budgetCents) * 100;

    const monthlyTotalDollars = centsToDollars(monthlyTotalCents);
    const budgetDollars = centsToDollars(budgetCents);

    if (pct >= 100) {
      const title = 'Over Budget Alert';
      const message = `Your recurring spend ($${monthlyTotalDollars.toFixed(2)}/mo) has exceeded your $${budgetDollars.toFixed(2)} monthly budget.`;
      const created = await insertNotification(
        userId,
        title,
        message,
        'budget_alert',
        toLocalDateStr(new Date()),
        null
      );
      if (created) {
        result.budgetAlerts++;
        if (recipient && (await sendAlertEmailIfEnabled(recipient, prefs, 'budget', title, message))) {
          result.emailsSent!++;
        }
      }
    } else if (pct >= 80) {
      const title = 'Approaching Budget Limit';
      const message = `You are at ${pct.toFixed(0)}% of your monthly budget ($${monthlyTotalDollars.toFixed(2)} of $${budgetDollars.toFixed(2)}).`;
      const created = await insertNotification(
        userId,
        title,
        message,
        'budget_alert',
        toLocalDateStr(new Date()),
        null
      );
      if (created) {
        result.budgetAlerts++;
        if (recipient && (await sendAlertEmailIfEnabled(recipient, prefs, 'budget', title, message))) {
          result.emailsSent!++;
        }
      }
    }
  }

  return result;
}

/** Run alerts for every user in the platform (used by the cron). */
export async function generateAlertsForAllUsers(): Promise<AlertsResult> {
  const users = await db.all<{
    id: string;
    monthly_budget: number;
    email: string;
    name: string;
    email_preferences: string | null;
  }>('SELECT id, monthly_budget, email, name, email_preferences FROM users');
  const totals: AlertsResult = { renewalAlerts: 0, trialAlerts: 0, budgetAlerts: 0, trialConversions: 0, emailsSent: 0 };

  for (const u of users) {
    try {
      const r = await generateAlertsForUser(u.id, u);
      totals.renewalAlerts += r.renewalAlerts;
      totals.trialAlerts += r.trialAlerts;
      totals.budgetAlerts += r.budgetAlerts;
      totals.trialConversions += r.trialConversions;
      totals.emailsSent = (totals.emailsSent || 0) + (r.emailsSent || 0);
    } catch (err) {
      console.error(`[Alerts] Failed for user ${u.id}:`, err);
    }
  }
  return totals;
}
