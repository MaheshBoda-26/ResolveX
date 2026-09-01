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
          exclude: ['**/web/**', '**/node_modules/**'],
          testTimeout: 30000,
          hookTimeout: 30000,
          setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
          root: './apps/api',
        },
      },
      {
        test: {
          name: 'evaluation',
          environment: 'node',
          include: ['../../tests/evaluation/**/*.test.ts'],
          exclude: ['**/web/**', '**/node_modules/**'],
          testTimeout: 60000,
          hookTimeout: 30000,
          setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
          root: './apps/api',
        },
      },
      './apps/web/vitest.config.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/web/src'),
      '@resolvex/shared/messaging': path.resolve(__dirname, './packages/shared/src/messaging'),
      '@resolvex/shared': path.resolve(__dirname, './packages/shared/src'),
      '@resolvex/api': path.resolve(__dirname, './apps/api/src'),
    },
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
  },
});