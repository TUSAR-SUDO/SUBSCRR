import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Dev convenience: never block local boot on a missing secret. Production
// requires an explicit secret — fail loudly (build OR boot) with a clear
// message instead of Payload's cryptic empty-secret errors downstream.
if (process.env.NODE_ENV === 'production' && !process.env.PAYLOAD_SECRET) {
  throw new Error(
    'PAYLOAD_SECRET must be set in production (generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))").'
  );
}
if (process.env.NODE_ENV !== 'production' && !process.env.PAYLOAD_SECRET) {
  process.env.PAYLOAD_SECRET =
    'dev-only-subscrr-payload-secret-do-not-use-in-prod-9f2c';
}

if (!process.env.PAYLOAD_DATABASE_URI) {
  // libsql (the SQLite client Payload uses) needs an explicit file: scheme —
  // a bare Windows path ("C:\...") is rejected as an unsupported URL.
  const dbPath = path.join(dirname, 'subscrr-content.db');
  process.env.PAYLOAD_DATABASE_URI = `file:${dbPath.replace(/\\/g, '/')}`;
} else if (!/^[a-z]+:/.test(process.env.PAYLOAD_DATABASE_URI)) {
  process.env.PAYLOAD_DATABASE_URI = `file:${process.env.PAYLOAD_DATABASE_URI.replace(/\\/g, '/')}`;
}

export const payloadEnv = {
  secret: process.env.PAYLOAD_SECRET || '',
  dbUri: process.env.PAYLOAD_DATABASE_URI || '',
};
