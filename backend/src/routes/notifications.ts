import { Router } from 'express';
import { z } from 'zod';
import db from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { Notification, EmailPreferences } from '../types/index.js';
import { generateAlertsForUser } from '../services/alerts.js';

const router = Router();

const emailPrefsSchema = z.object({
  body: z.object({
    renewalAlerts: z.boolean().optional(),
    trialAlerts: z.boolean().optional(),
    budgetAlerts: z.boolean().optional(),
  }),
});

// GET /api/notifications/email-preferences — current email switches (defaults applied).
router.get('/email-preferences', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    let stored: Partial<EmailPreferences> = {};
    const raw = req.user!.email_preferences;
    if (raw) {
      try {
        stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        stored = {};
      }
    }

    res.json({
      success: true,
      data: {
        // Defaults mirror the alerts service so the UI always shows the truth.
        renewalAlerts: stored.renewalAlerts ?? true,
        trialAlerts: stored.trialAlerts ?? true,
        budgetAlerts: stored.budgetAlerts ?? true,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/email-preferences — persist partial updates.
router.patch('/email-preferences', authenticateToken, validate(emailPrefsSchema), async (req: AuthRequest, res, next) => {
  try {
    let stored: Partial<EmailPreferences> = {};
    const raw = req.user!.email_preferences;
    if (raw) {
      try {
        stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        stored = {};
      }
    }

    const updated: EmailPreferences = {
      renewalAlerts: req.body.renewalAlerts ?? stored.renewalAlerts ?? true,
      trialAlerts: req.body.trialAlerts ?? stored.trialAlerts ?? true,
      budgetAlerts: req.body.budgetAlerts ?? stored.budgetAlerts ?? true,
    };

    await db.run(
      "UPDATE users SET email_preferences = ?, updated_at = datetime('now') WHERE id = ?",
      [JSON.stringify(updated), req.user!.id]
    );

    res.json({
      success: true,
      message: 'Email preferences updated',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const notifications = await db.all<Notification>(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );

    const unreadCount = notifications.filter((n) => n.is_read === 0).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const notif = await db.get<Notification>(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (!notif) {
      throw new AppError('Notification not found', 404);
    }

    await db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: { id, is_read: 1 },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id — permanently remove one notification (user-scoped)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    if (!result.changes) {
      throw new AppError('Notification not found', 404);
    }

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/check-reminders — regenerate alerts on demand.
// The cron runs this daily; this endpoint lets the client refresh immediately
// (e.g. after adding a subscription due tomorrow).
router.post('/check-reminders', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const result = await generateAlertsForUser(req.user!.id, req.user!);

    res.json({
      success: true,
      message: 'Alerts refreshed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
