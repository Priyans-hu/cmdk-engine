import { defineConfig } from 'vitest/config'

// Tests the BUILT package: tests-dist/ imports `cmdk-engine/*`, which resolves to
// dist/ through package.json `exports`. Run it after `bun run build`; it stays out
// of vitest.config.ts so `bun run test` never needs a build.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests-dist/**/*.test.{ts,tsx}'],
  },
})
