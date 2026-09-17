import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit (pure functions) + integration (supertest against a fresh in-memory DB)
    include: ['src/**/*.test.ts'],
    // Run files sequentially: each integration file shares one sqlite file DB.
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      // Dedicated throwaway DB — never touches backend/data/subscrr.db.
      DB_PATH: './data/test-subscrr.db',
      JWT_SECRET: 'test-secret-test-secret-test-secret-123456',
      VITEST: 'true',
    },
    // Start each test FILE with a clean slate.
    globalSetup: './src/test/globalSetup.ts',
  },
});
