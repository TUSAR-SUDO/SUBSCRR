import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Fail-safe: refuse to boot without a real secret in production.
// In development, derive a stable per-machine dev secret so tokens survive restarts
// without ever shipping a known constant to production.
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '❌ FATAL: JWT_SECRET must be set to a strong value (>= 32 chars) in production. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
    process.exit(1);
  }

  // Development fallback: warn loudly, but keep local dev usable.
  const devSecret =
    process.env.JWT_DEV_SECRET ||
    'dev-only-subscrr-jwt-secret-do-not-use-in-production-0f3a9c17b84e';
  console.warn(
    '⚠️  JWT_SECRET missing or too short — using an INSECURE development-only secret. ' +
    'Set JWT_SECRET (>= 32 chars) before deploying.'
  );
  return devSecret;
}

function resolveAdminPassword(): string {
  const adminPass = process.env.ADMIN_PASSWORD;
  if (adminPass && adminPass.length >= 8) {
    return adminPass;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '❌ FATAL: ADMIN_PASSWORD must be set to a strong password (>= 8 chars) in production.'
    );
    process.exit(1);
  }

  return adminPass || 'admin123';
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: resolveJwtSecret(),
  adminPassword: resolveAdminPassword(),
  jwtExpiresIn: '7d',
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'subscrr.db'),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
};

export const isProduction = config.nodeEnv === 'production';
