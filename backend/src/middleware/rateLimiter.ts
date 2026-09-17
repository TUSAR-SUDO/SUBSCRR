import rateLimit from 'express-rate-limit';

// Integration tests hammer the API; disable limiting under the test runner
// so suites don't trip 429s and flake.
const rateLimitDisabled = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const skip = () => rateLimitDisabled;

// Standard general API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter limiter for authentication endpoints (prevent brute-force attacks)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // Limit each IP to 25 auth attempts per 15 minutes
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// Session revalidation (GET /auth/me) fires on every app boot/page load for
// users with a stored token. It is credential-CARRYING, not credential-
// GUESSING, so it must not drain the brute-force login budget — otherwise
// normal usage (plus health probes and multi-tab apps) locks real users out
// of signing in. Generous per-IP budget; login/register stay on authLimiter.
export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many session checks from this IP, please try again after 15 minutes.',
  },
});

// Rate limiter for AI receipt scanner (protect computational resources)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI parsing requests per 15 minutes
  skip,  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI scanning limit reached for this session. Please try again shortly.',
  },
});

// Tight limiter for endpoints that trigger outbound email (reset requests).
// Each attempt costs the provider money and can be abused to spam third parties.
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 email-triggering requests per hour per IP
  skip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many email requests. Please try again after an hour.',
  },
});
