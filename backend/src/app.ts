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

/**
 * Per-request CORS decision (cors delegate form).
 *
 * Scope: applied ONLY to Express-owned API paths — never to pages, /_next
 * assets, or Payload routes. Next tags its own scripts with `crossorigin`,
 * so a global CORS gate used to 403 the site's OWN chunk loads when the
 * request's Origin (the site itself) wasn't in the allowlist — killing
 * hydration on fresh deployments before FRONTEND_URL was ever set.
 *
 * Allowed on API routes:
 *  - non-browser requests (no Origin header): curl, health probes
 *  - same-origin requests (Origin host === Host header): the site calling
 *    its own API — works even before FRONTEND_URL is configured
 *  - explicit allowlist (CORS_ORIGINS / FRONTEND_URL)
 *  - localhost variants in development only
 */
const corsDelegate: cors.CorsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;
  const hostHeader = req.headers.host || '';
  let allowed = !origin; // curl / server-to-server / health checks

  if (origin) {
    try {
      const o = new URL(origin);
      if (o.host === hostHeader) allowed = true; // same-origin API call
      else if (!isProduction && ['localhost', '127.0.0.1'].includes(o.hostname)) allowed = true;
      else if (allowedOrigins.includes(origin)) allowed = true;
    } catch {
      allowed = false; // malformed Origin — deny
    }
  }

  callback(null, {
    // false => no ACAO header => the browser blocks cross-origin reads.
    origin: allowed,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
};

const corsMiddleware = cors(corsDelegate);

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

// Paths the Express API owns in a unified deployment: the JSON API and the
// token-gated uploads static server. EVERYTHING else — pages, /_next assets,
// /admin, Payload REST/GraphQL, /graphql — belongs to Next.js and must reach
// it WITHOUT the strict API CSP. Next's SSR HTML relies on inline hydration
// <script> tags; an API-grade `script-src 'self'` on page routes makes the
// browser silently drop them, the app never hydrates, and users are stuck on
// the splash screen (exactly the production bug this predicate fixed).
const isApiOwnedPath = (p: string) =>
  p.startsWith('/uploads') ||
  (p.startsWith('/api/') && !p.startsWith('/api/payload'));

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Behind nginx/Cloudflare/Render proxy in production

  // HTTP Request Logging
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

  // Security headers (profile chosen per route family — see above)
  app.use((req, res, next) => {
    if (isProduction) {
      return (isApiOwnedPath(req.path) ? prodHelmetApi : prodHelmetNext)(req, res, next);
    }
    return devHelmet(req, res, next);
  });

  // CORS — API surfaces only (see corsDelegate docstring). Pages, /_next
  // assets, and Payload routes pass through untouched.
  app.use((req, res, next) => {
    if (!isApiOwnedPath(req.path)) return next();
    return corsMiddleware(req, res, next);
  });

  // Body parsers — only for Express-owned API routes, so Next route handlers
  // (Payload media uploads especially) read the raw request stream themselves.
  app.use((req, res, next) => {
    if (!isApiOwnedPath(req.path)) return next();
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
