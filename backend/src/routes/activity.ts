import { Router } from 'express';
import db from '../db/index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { ActivityLog } from '../types/index.js';

const router = Router();

// GET /api/activity
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const logs = await db.all<ActivityLog>(
      'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [userId]
    );

    res.json({
      success: true,
      data: { logs },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
