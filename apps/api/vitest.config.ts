import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '3001',
      DATABASE_URL: 'postgresql://attention_app:attention_dev_secret_change_me@127.0.0.1:5432/attention_test?schema=public',
      JWT_ACCESS_SECRET: 'test_jwt_access_secret_min_32_characters_long_for_unit_tests',
      REFRESH_TTL_DAYS: '7',
      CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
      AI_SERVICE_URL: 'http://127.0.0.1:8000',
      LOG_LEVEL: 'silent',
    },
  },
});
