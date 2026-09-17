import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { Subscription } from '../types/index.js';
import { addCycle, todayLocal, toLocalDateStr } from '../utils/dates.js';
import { generateAlertsForAllUsers } from './alerts.js';
import { centsToDollars } from './money.js';

// Per-session guest demo accounts use this email domain and expire after 24h.
const DEMO_EMAIL_DOMAIN = '@demo.subscrr.local';

/**
 * Calculates the next renewal date given current date and cycle.
 * Month-end safe: Jan 31 + 1 month => Feb 28/29 (not a rolled-over March date).
 */
export function calculateNextRenewalDate(currentDateStr: string, cycle: string): string {
  let candidate = currentDateStr;
  const todayStr = toLocalDateStr(todayLocal());

  // Step forward until the next renewal is strictly in the future
  // (handles renewals that were missed for days/weeks/months).
  for (let i = 0; i < 1200; i++) {
    candidate = addCycle(candidate, cycle);
    if (candidate > todayStr) break;
  }
  return candidate;
}

/**
 * Scans active subscriptions and advances any that have reached or passed their
 * renewal date. Scoped to one user when scopeUserId is provided (user endpoint);
 * global when omitted (cron).
 */
export async function advanceRenewals(scopeUserId?: string): Promise<{
  processedCount: number;
  renewedSubscriptions: Array<{ id: string; name: string; oldDate: string; newDate: string }>;
}> {
  const todayStr = toLocalDateStr(todayLocal());

  const dueSubscriptions = scopeUserId
    ? await db.all<Subscription>(
        `SELECT * FROM subscriptions
         WHERE status = 'active' AND next_renewal_date <= ? AND user_id = ?`,
        [todayStr, scopeUserId]
      )
    : await db.all<Subscription>(
        `SELECT * FROM subscriptions
         WHERE status = 'active' AND next_renewal_date <= ?`,
        [todayStr]
      );

  const renewedList: Array<{ id: string; name: string; oldDate: string; newDate: string }> = [];

  for (const sub of dueSubscriptions) {
    const oldDate = sub.next_renewal_date;
    const newDate = calculateNextRenewalDate(oldDate, sub.billing_cycle);

    await db.run(
      `UPDATE subscriptions
       SET next_renewal_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newDate, sub.id]
    );

    await db.run(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, renewal_date, subscription_id, created_at)
       VALUES (?, ?, ?, ?, 'renewal', 0, ?, ?, datetime('now'))`,
      [
        uuidv4(),
        sub.user_id,
        `Subscription Auto-Renewed: ${sub.name}`,
        `Your ${sub.name} subscription automatically renewed for ${(sub.currency || 'USD')} ${(centsToDollars(sub.amount_cents ?? Math.round(sub.amount * 100))).toFixed(2)}. Next renewal is scheduled for ${newDate}.`,
        newDate,
        sub.id,
      ]
    );

    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, created_at)
       VALUES (?, ?, 'subscription_renewed', 'subscription', ?, ?, datetime('now'))`,
      [
        uuidv4(),
        sub.user_id,
        sub.id,
        `Automatically renewed ${sub.name} (${sub.billing_cycle}). Date rolled from ${oldDate} to ${newDate}.`,
      ]
    );

    renewedList.push({ id: sub.id, name: sub.name, oldDate, newDate });
  }

  if (renewedList.length > 0) {
    console.log(`🔄 [Scheduler] Auto-advanced ${renewedList.length} subscription renewal(s)`);
  }

  return {
    processedCount: renewedList.length,
    renewedSubscriptions: renewedList,
  };
}

/** Delete guest demo accounts older than 24h (cascades to their data). */
async function purgeExpiredDemoUsers(): Promise<number> {
  const result = await db.run(
    `DELETE FROM users
     WHERE email LIKE ?
       AND datetime(created_at) < datetime('now', '-24 hours')`,
    [`%${DEMO_EMAIL_DOMAIN}`]
  );
  return result.changes;
}

/**
 * Starts the background cron scheduler.
 */
export function startScheduler() {
  console.log('⏰ Initializing subscription scheduler...');

  // 1. Boot-time catch-up: renewals + expired-trial conversion + alerts.
  (async () => {
    try {
      const alerts = await generateAlertsForAllUsers();
      if (alerts.trialConversions > 0) {
        console.log(`🔁 [Boot] Converted ${alerts.trialConversions} expired trial(s) to active`);
      }
      await advanceRenewals();
      await purgeExpiredDemoUsers();
    } catch (err) {
      console.error('Error running boot-time scheduler pass:', err);
    }
  })();

  // 2. Daily at 00:05: renewals, trial conversion, alerts, guest cleanup.
  cron.schedule('5 0 * * *', async () => {
    console.log('⏰ [Cron] Daily subscription job starting...');
    try {
      const alerts = await generateAlertsForAllUsers();
      const renewals = await advanceRenewals();
      const purged = await purgeExpiredDemoUsers();
      console.log(
        `⏰ [Cron] Done. renewals=${renewals.processedCount} ` +
        `renewalAlerts=${alerts.renewalAlerts} trialAlerts=${alerts.trialAlerts} ` +
        `budgetAlerts=${alerts.budgetAlerts} trialConversions=${alerts.trialConversions} guestsPurged=${purged}`
      );
    } catch (err) {
      console.error('❌ [Cron] Daily job failed:', err);
    }
  });

  console.log('✅ Scheduler active: daily @ 00:05 (renewals, alerts, trial conversion, guest cleanup)');
}
