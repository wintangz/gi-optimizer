import { defineConfig } from 'vitest/config'
import { goAliases } from './go-paths.mjs'

const aliases = goAliases()

export default defineConfig({
  resolve: {
    alias: Object.entries(aliases).map(([find, replacement]) => ({
      find: new RegExp(`^${find.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}$`),
      replacement,
    })),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    testTimeout: 120_000,
    server: { deps: { inline: [/vendor[\\/]genshin-optimizer/] } },
  },
})

