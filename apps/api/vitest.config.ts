import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['../../tests/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    root: path.resolve(__dirname, '..', '..'),
  },
});