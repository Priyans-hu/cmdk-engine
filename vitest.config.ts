import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**'],
      exclude: ['src/**/index.ts'],
      thresholds: {
        statements: 78,
        branches: 65,
        functions: 80,
        lines: 78,
      },
    },
  },
})
