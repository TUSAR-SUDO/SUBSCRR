import { Router } from 'express';
import { z } from 'zod';
import { fetchExchangeRates, convertCurrency } from '../services/currency.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const convertSchema = z.object({
  body: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    from: z.string().min(3).max(4).default('USD'),
    to: z.string().min(3).max(4).default('USD'),
  }),
});

// GET /api/currency/rates?base=USD
router.get('/rates', async (req, res, next) => {
  try {
    const base = (req.query.base as string) || 'USD';
    const ratesData = await fetchExchangeRates(base);

    res.json({
      success: true,
      data: ratesData,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/currency/convert
router.post('/convert', validate(convertSchema), async (req, res, next) => {
  try {
    const { amount, from, to } = req.body;
    const result = await convertCurrency(amount, from, to);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
