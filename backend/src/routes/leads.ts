import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../db/index.js';
import { validate } from '../middleware/validate.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { Lead } from '../types/index.js';

const router = Router();

const leadSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    source: z.string().optional().default('landing_page'),
    notes: z.string().optional(),
  }),
});

// POST /api/leads (Public: Landing page early access / waitlist capture)
router.post('/', validate(leadSchema), async (req, res, next) => {
  try {
    const { email, source, notes } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const id = uuidv4();

    // Check if already captured
    const existing = await db.get<Lead>('SELECT id FROM leads WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.json({
        success: true,
        message: "You're already on our early access list! We'll reach out soon.",
        data: { id: existing.id, email: normalizedEmail },
      });
    }

    await db.run(
      `INSERT INTO leads (id, email, source, notes, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, normalizedEmail, source || 'landing_page', notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Thank you for joining the Subscrr early access waitlist!',
      data: { id, email: normalizedEmail },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads (Admin protected)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const leads = await db.all<Lead>('SELECT * FROM leads ORDER BY created_at DESC');
    res.json({
      success: true,
      data: { leads, count: leads.length },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
