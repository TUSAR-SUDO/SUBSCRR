import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import { config } from '../config.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Configure Multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) and PDFs are supported'));
    }
  },
});

// ---------------------------------------------------------------------------
// AI provider (OpenAI-compatible chat/vision API)
//
// Configure via env:
//   OPENAI_API_KEY   — required for AI extraction
//   OPENAI_BASE_URL  — optional (default https://api.openai.com/v1); lets you
//                      point at any OpenAI-compatible gateway (OpenRouter,
//                      Together, local vLLM, Gemini OpenAI-compat, …)
//   OPENAI_MODEL     — optional (default gpt-4o-mini); must be vision-capable
//                      for image scans.
// ---------------------------------------------------------------------------

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

interface AiExtraction {
  name: string;
  amount: number;
  currency: string;
  billing_cycle: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  category: string;
  status: 'active' | 'trial' | 'paused';
  next_renewal_date: string;
  payment_method: string;
  website_url: string;
  color: string;
  confidence: number;
}

const AI_SYSTEM_PROMPT = `You are Subscrr's receipt-extraction engine. You receive the text (and optionally a photo) of a subscription invoice, billing email, or bank-statement line, and you return ONLY a JSON object with these exact fields:

{
  "name": "service/merchant name (e.g. 'ChatGPT Plus', 'Netflix Premium')",
  "amount": <number, the recurring charge in major currency units>,
  "currency": "<ISO 4217 code, e.g. USD, EUR, GBP, INR>",
  "billing_cycle": "<daily|weekly|monthly|quarterly|yearly>",
  "category": "<one of: Entertainment, Music, AI Tools, Development, Design, Cloud Storage, Productivity, Health & Fitness, News, Gaming, Education, Other>",
  "status": "<active|trial>  (trial only if the receipt says free trial/trial period)",
  "next_renewal_date": "<YYYY-MM-DD — the NEXT charge/renewal date; if only the last billing date exists, add one cycle>",
  "payment_method": "<Apple Pay|Google Pay|PayPal|Visa|MasterCard|Amex|Bank Transfer|Credit Card>",
  "website_url": "<merchant website or empty string>",
  "color": "<6-digit hex brand color of the merchant, e.g. #E50914 for Netflix>",
  "confidence": <integer 0-100, how sure you are the extraction is correct>
}

Rules:
- Use the ACTUAL amount printed on the document — never guess a price.
- If the document is not about a recurring subscription, return {"error": "not_a_subscription"}.
- If a field is genuinely undeterminable, use your best inference from the document and LOWER confidence accordingly.
- Respond with the JSON object only — no markdown, no prose.`;

async function extractWithAi(input: { text?: string; imageBase64?: string; imageMime?: string }): Promise<AiExtraction> {
  const apiKey = process.env.OPENAI_API_KEY!.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  const content: Array<Record<string, unknown>> = [];
  if (input.imageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:${input.imageMime};base64,${input.imageBase64}` } });
  }
  if (input.text) {
    content.push({ type: 'text', text: `Receipt/statement text:\n${input.text.slice(0, 6000)}` });
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        max_tokens: 600,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err: any) {
    throw new AppError(`AI provider unreachable (${err?.message || 'network error'}). Check OPENAI_BASE_URL / internet.`, 502);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 401) throw new AppError('AI provider rejected the API key (401). Check OPENAI_API_KEY.', 502);
    throw new AppError(`AI provider error ${response.status}: ${body.slice(0, 200)}`, 502);
  }

  const json: any = await response.json();
  const raw = json?.choices?.[0]?.message?.content;
  if (!raw) throw new AppError('AI provider returned an empty response.', 502);

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError('AI returned malformed JSON — try again.', 502);
  }
  if (parsed.error === 'not_a_subscription') {
    throw new AppError('This document does not look like a subscription charge. Try a receipt, invoice, or billing email.', 422);
  }

  const cycles = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
  const amount = Number(parsed.amount);
  if (!parsed.name || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError('AI could not determine the service name or amount from this document.', 422);
  }

  return {
    name: String(parsed.name).slice(0, 60),
    amount,
    currency: String(parsed.currency || 'USD').toUpperCase().slice(0, 3),
    billing_cycle: cycles.includes(parsed.billing_cycle) ? parsed.billing_cycle : 'monthly',
    category: String(parsed.category || 'Other').slice(0, 40),
    status: parsed.status === 'trial' ? 'trial' : 'active',
    next_renewal_date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.next_renewal_date || '')
      ? parsed.next_renewal_date
      : new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0],
    payment_method: String(parsed.payment_method || 'Credit Card').slice(0, 30),
    website_url: String(parsed.website_url || '').slice(0, 200),
    color: /^#[0-9a-fA-F]{6}$/.test(parsed.color || '') ? parsed.color : '#FF2500',
    confidence: Math.min(99, Math.max(1, Math.round(Number(parsed.confidence) || 70))),
  };
}

// ---------------------------------------------------------------------------
// Local heuristic parser — FALLBACK for pasted text only when no AI key is
// configured. It is regex-based and clearly labelled as "basic local parse"
// in its output so users never mistake it for the AI engine. It NEVER
// invents amounts: if none is found, it says so.
// ---------------------------------------------------------------------------

const merchantDatabase = [
  { patterns: [/chatgpt/i, /openai/i], name: 'ChatGPT Plus', category: 'AI Tools', color: '#10A37F', website: 'https://chat.openai.com' },
  { patterns: [/claude/i, /anthropic/i], name: 'Claude Pro', category: 'AI Tools', color: '#D97706', website: 'https://claude.ai' },
  { patterns: [/midjourney/i], name: 'Midjourney', category: 'AI Tools', color: '#7289DA', website: 'https://midjourney.com' },
  { patterns: [/netflix/i], name: 'Netflix', category: 'Entertainment', color: '#E50914', website: 'https://netflix.com' },
  { patterns: [/spotify/i], name: 'Spotify Premium', category: 'Music', color: '#1DB954', website: 'https://spotify.com' },
  { patterns: [/github/i, /copilot/i], name: 'GitHub Copilot', category: 'Development', color: '#24292F', website: 'https://github.com' },
  { patterns: [/figma/i], name: 'Figma', category: 'Design', color: '#F24E1E', website: 'https://figma.com' },
  { patterns: [/youtube/i], name: 'YouTube Premium', category: 'Entertainment', color: '#FF0000', website: 'https://youtube.com' },
  { patterns: [/adobe/i, /creative cloud/i], name: 'Adobe Creative Cloud', category: 'Design', color: '#FF0000', website: 'https://adobe.com' },
];

function parseHeuristic(text: string) {
  let detectedAmount = 0;
  let currency = 'USD';
  let cycle: AiExtraction['billing_cycle'] = 'monthly';
  let name = '';
  let color = '#FF2500';
  let category = 'Other';
  let websiteUrl = '';

  const merchant = merchantDatabase.find((m) => m.patterns.some((p) => p.test(text)));
  if (merchant) {
    name = merchant.name;
    category = merchant.category;
    color = merchant.color;
    websiteUrl = merchant.website;
  }

  for (const regex of [
    /(?:total|amount|charged|paid|fee|subtotal|due)[\s:]*[$€£₹]?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /[$€£₹]\s*([0-9]+(?:[.,][0-9]{1,2})?)/,
    /([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:usd|eur|gbp|inr)/i,
  ]) {
    const match = text.match(regex);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      if (value > 0 && value < 100_000) {
        detectedAmount = value;
        break;
      }
    }
  }

  if (/€|eur/i.test(text)) currency = 'EUR';
  else if (/£|gbp/i.test(text)) currency = 'GBP';
  else if (/₹|inr/i.test(text)) currency = 'INR';
  else if (/¥|jpy/i.test(text)) currency = 'JPY';

  if (/year|yearly|annual|12 months/i.test(text)) cycle = 'yearly';
  else if (/quarter|quarterly|3 months/i.test(text)) cycle = 'quarterly';
  else if (/week|weekly|7 days/i.test(text)) cycle = 'weekly';
  else if (/day|daily/i.test(text)) cycle = 'daily';

  if (!name) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    name = (lines[0] || 'New Subscription').slice(0, 40);
  }

  const dateMatch = text.match(
    /(?:next (?:billing|charge|renewal)|renewal date|due date)[\s:]*([A-Za-z]{3,9}\s+[0-9]{1,2},?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i
  );
  let nextDate = '';
  if (dateMatch) {
    const parsed = new Date(dateMatch[1]);
    if (!isNaN(parsed.getTime())) nextDate = parsed.toISOString().split('T')[0];
  }

  const confidence = Math.min(
    75,
    35 + (merchant ? 20 : 0) + (detectedAmount > 0 ? 15 : 0) + (nextDate ? 5 : 0)
  );

  return {
    name,
    amount: detectedAmount, // may be 0 → UI asks the user to fill it in
    currency,
    billing_cycle: cycle,
    category,
    status: /trial/i.test(text) ? ('trial' as const) : ('active' as const),
    next_renewal_date:
      nextDate || new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0],
    payment_method: /apple pay/i.test(text)
      ? 'Apple Pay'
      : /paypal/i.test(text)
      ? 'PayPal'
      : /google pay/i.test(text)
      ? 'Google Pay'
      : 'Credit Card',
    website_url: websiteUrl,
    color,
    confidence,
    engine: 'local' as const,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /api/ai/scan-receipt
// Body: multipart with `receiptImage` (image/PDF)  → AI vision extraction
//       or JSON { statementText: "..." }           → AI text extraction
router.post('/scan-receipt', authenticateToken, upload.single('receiptImage'), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const hasFile = Boolean(req.file);
    const statementText = typeof req.body.statementText === 'string' ? req.body.statementText.trim() : '';

    if (!hasFile && !statementText) {
      throw new AppError('Attach a receipt image or paste statement text.', 400);
    }

    let parsed: (AiExtraction & { engine: 'ai' }) | ReturnType<typeof parseHeuristic>;

    if (isAiConfigured()) {
      let imageBase64: string | undefined;
      let imageMime: string | undefined;
      if (hasFile) {
        const mime = req.file!.mimetype || 'image/png';
        if (mime === 'application/pdf') {
          throw new AppError('PDF vision extraction needs the AI provider to support documents — upload a photo/screenshot (PNG/JPG) instead.', 422);
        }
        imageBase64 = fs.readFileSync(req.file!.path).toString('base64');
        imageMime = mime;
      }
      parsed = { ...(await extractWithAi({ text: statementText || undefined, imageBase64, imageMime })), engine: 'ai' };
    } else {
      // No AI key: only pasted TEXT can be handled locally. Images would
      // require OCR + guessing — we refuse honestly instead of inventing data.
      if (hasFile) {
        throw new AppError(
          'AI vision is not configured on this server. Add OPENAI_API_KEY to backend/.env to scan receipt images (or paste the receipt text instead).',
          503
        );
      }
      parsed = parseHeuristic(statementText);
    }

    await db.run(
      `INSERT INTO activity_logs (id, user_id, action, entity_type, details, created_at)
       VALUES (?, ?, 'SCANNED_RECEIPT', 'ai_scanner', ?, datetime('now'))`,
      [uuidv4(), userId, `Scanned via ${parsed.engine === 'ai' ? 'AI vision' : 'local parse'}: ${parsed.name} (${parsed.currency} ${parsed.amount}) @ ${parsed.confidence}% confidence`]
    );

    res.json({
      success: true,
      message: parsed.engine === 'ai' ? 'Extracted by AI vision' : 'Parsed locally (basic mode — set OPENAI_API_KEY for full AI)',
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
