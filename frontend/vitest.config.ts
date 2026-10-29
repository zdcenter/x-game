import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    exclude: [
      'src/app/app.component.spec.ts',
      'src/app/shared/components/game-header/**'
    ],
  },
});
