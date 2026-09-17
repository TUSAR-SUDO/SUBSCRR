import fs from 'fs';
import path from 'path';

export default function globalSetup() {
  // Remove any previous test database so each `vitest` run starts fresh.
  const dbPath = path.resolve(process.cwd(), 'data', 'test-subscrr.db');
  for (const suffix of ['', '-shm', '-wal']) {
    const f = dbPath + suffix;
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  console.log(`[test] Clean test DB prepared at ${dbPath}`);
}
