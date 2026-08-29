import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['../../tests/unit/**/*.test.ts', '../../tests/integration/**/*.test.ts'],
          testTimeout: 30000,
          hookTimeout: 30000,
          root: './apps/api',
        },
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          include: ['../../apps/web/tests/**/*.test.{ts,tsx}'],
          exclude: ['**/*.spec.ts', '**/tests-e2e/**'],
          globals: true,
          setupFiles: ['../../apps/web/tests/setup.ts'],
          root: './apps/api',
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@resolvex/shared': path.resolve(__dirname, './packages/shared/src'),
      '@resolvex/api': path.resolve(__dirname, './apps/api/src'),
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
  },
});