import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['packages/**/*.test.ts', 'apps/api/test/**/*.test.ts'], environment: 'node' },
  resolve: {
    alias: {
      '@aurel/shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname.replace(
        /^\/([A-Z]:)/,
        '$1',
      ),
    },
  },
});
