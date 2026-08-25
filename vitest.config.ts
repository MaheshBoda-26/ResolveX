import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['../../tests/**/*.test.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
          root: './apps/api',
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['apps/web/tests/**/*.test.{ts,tsx}'],
          exclude: ['**/*.spec.ts', '**/tests-e2e/**'],
          globals: true,
          setupFiles: ['./apps/web/tests/setup.ts'],
        },
      },
    ],
  },
});