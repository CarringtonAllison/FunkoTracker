import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Use an in-memory SQLite DB for tests so they never touch the real data file
    env: {
      DB_PATH: ':memory:',
    },
  },
});
