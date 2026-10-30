import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**'],
    },
  },
  resolve: {
    alias: {
      'modern-screenshot': new URL('./test/__mocks__/modern-screenshot.ts', import.meta.url)
        .pathname,
    },
  },
});
