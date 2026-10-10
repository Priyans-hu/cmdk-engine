import { defineConfig } from 'vitest/config'

// Node 25+ defines a global `localStorage` of its own (empty without
// --localstorage-file), which hides jsdom's, so storage tests fail there. Turn it
// off so jsdom's is installed. Node 20 rejects the flag.
const nodeMajor = Number(process.versions.node.split('.')[0])

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    execArgv: nodeMajor >= 25 ? ['--no-experimental-webstorage'] : [],
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
