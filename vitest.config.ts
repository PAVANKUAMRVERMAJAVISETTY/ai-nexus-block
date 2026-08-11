import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Route handlers and React components are covered by the build and by
    // manual verification; these suites target the pure, security-critical
    // modules where a regression would not be visible at the UI layer.
    coverage: {
      include: ['lib/ide/**', 'lib/ai/**'],
    },
  },
});
