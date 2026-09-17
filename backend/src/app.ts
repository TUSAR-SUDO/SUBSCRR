import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { config, isProduction } from './config.js';
import db from './db/index.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { authenticateToken, AuthRequest } from './middleware/auth.js';
import { apiLimiter, authLimiter, sessionLimiter, aiLimiter, emailLimiter } from './middleware/rateLimiter.js';
import { getEmailTransportMode } from './services/email.js';

// Route imports
import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscriptions.js';
import analyticsRoutes from './routes/analytics.js';
import calendarRoutes from './routes/calendar.js';
import aiRoutes from './routes/ai.js';
import notificationRoutes from './routes/notifications.js';
import activityRoutes from './routes/activity.js';
import leadRoutes from './routes/leads.js';
import adminRoutes from './routes/admin.js';
import currencyRoutes from './routes/currency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Hardened CORS: explicit allowlist, never wildcard in production.
const allowedOrigins = (process.env.CORS_ORIGINS || config.frontendUrl)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Dev conveniences: allow localhost variants and LAN dev servers.
if (!isProduction) {
  allowedOrigins.push(
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  );
}

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow non-browser requests (curl, health checks, same-origin) with no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(`Origin ${origin} not allowed by CORS`, 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

// --- Security headers: two production profiles -----------------------------
// The unified deployment (single Render service) serves Express API routes and
// Next.js pages from the same process. Next.js injects inline hydration
// scripts into its pages, which a strict API CSP would block — so Next-owned
// routes get every header EXCEPT the CSP (Next manages its own), while
// Express-owned API surfaces keep the full strict CSP.
const prodHelmetApi = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
});

const prodHelmetNext = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
});

const devHelmet = helmet({
  contentSecurityPolicy: false, // dev: avoid blocking API clients / preview tooling
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: false,
});

// Routes Next.js owns in a unified deployment (pages, client assets, Payload
// admin + REST + GraphQL). Everything else is Express API surface.
const isNextOwnedPath = (p: string) =>
  p.startsWith('/_next') ||
  p.startsWith('/admin') ||
  p.startsWith('/api/payload') ||
  p.startsWith('/graphql');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Behind nginx/Cloudflare/Render proxy in production

  // HTTP Request Logging
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Security headers (profile chosen per route family — see above)
  app.use((req, res, next) => {
    if (isProduction) {
      return (isNextOwnedPath(req.path) ? prodHelmetNext : prodHelmetApi)(req, res, next);
    }
    return devHelmet(req, res, next);
  });

  // CORS
  app.use(cors(corsOptions));

  // Body parsers — skipped for Next-owned routes so Next route handlers
  // (Payload media uploads especially) read the raw request stream themselves.
  app.use((req, res, next) => {
    if (isNextOwnedPath(req.path)) return next();
    express.json({ limit: '10mb' })(req, res, (err) => {
      if (err) return next(err);
      express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
    });
  });

  // Disable resource hints leaking internal paths
  app.disable('x-powered-by');

  // Static uploads serving (receipts). These are private user documents, so
  // every fetch requires a valid Bearer token — anonymous enumeration of the
  // uploads directory is no longer possible. Per-file ACL + signed URLs land
  // when receipts become first-class records (see ROADMAP); a private bucket
  // is the production-grade end state.
  app.use(
    '/uploads',
    (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next(new AppError('Method not allowed for uploads', 405));
      }
      authenticateToken(req as AuthRequest, res, next);
    },
    helmet.crossOriginResourcePolicy({ policy: 'same-site' }),
    helmet.noSniff(),
    express.static(config.uploadDir, {
      index: false,
      dotfiles: 'ignore',
      maxAge: '1d',
    })
  );

  // Health check endpoint (exempt from rate limits). Verifies the DB is
  // actually answering, not just that the process is alive — Docker/K8s
  // healthchecks and uptime monitors should trust it as a real dependency check.
  app.get('/api/health', async (req, res, next) => {
    try {
      const started = Date.now();
      await db.get('SELECT 1');
      res.json({
        status: 'ok',
        service: 'Subscrr API Backend',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        email: getEmailTransportMode(),
        db: { ok: true, latencyMs: Date.now() - started },
      });
    } catch (err) {
      // DB down => the service is not healthy. Surface 503 for load balancers.
      console.error('[health] database check failed:', err);
      res.status(503).json({
        status: 'error',
        service: 'Subscrr API Backend',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        email: getEmailTransportMode(),
        db: { ok: false },
      });
    }
  });

  // Global API Rate Limiting — but NOT for /api/payload (Payload CMS REST:
  // admin panel + content API traffic is bursty by nature and would exhaust
  // the app API budget; it is authenticated separately by Payload).
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/payload')) return next();
    return apiLimiter(req, res, next);
  });

  // API Routes with specialized limiters
  // /auth/me is session revalidation, not a brute-force surface — give it its
  // own generous budget so page loads never drain the login limiter.
  app.use(
    '/api/auth',
    (req, res, next) => {
      if (req.method === 'GET' && req.path === '/me') return sessionLimiter(req, res, next);
      return authLimiter(req, res, next);
    },
    authRoutes
  );
  // Password-reset request has its own tight budget (each call can send an email)
  app.use('/api/auth/forgot-password', emailLimiter);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/ai', aiLimiter, aiRoutes);
  app.use('/api/currency', currencyRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/admin', adminRoutes);

  // 404 handler for undefined API routes. /api/payload falls through — in
  // unified deployments those requests continue to the Next.js handler.
  app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/payload')) return next();
    next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export default createApp;
