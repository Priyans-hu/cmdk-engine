import { defineConfig } from 'vitest/config'

// Runs the built Base UI adapter against the lowest @base-ui/react version the
// peer range allows, installed as the `base-ui-floor` npm alias. Vite applies the
// alias to the adapter's own imports in dist/ as well. Only the ESM entry: the CJS
// entry resolves through Node, so it always gets the regular devDependency.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@base-ui\/react(\/|$)/, replacement: 'base-ui-floor$1' }],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests-dist/base-ui.test.tsx'],
    testNamePattern: /ESM/,
    env: { BASE_UI_FLOOR: '1.1.0' },
  },
})
