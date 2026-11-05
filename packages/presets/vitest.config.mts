import { defineConfig } from 'vitest/config'
import { goAliases } from '../../tooling/go-paths.mjs'

export default defineConfig({
  resolve: {
    alias: Object.entries(goAliases()).map(([find, replacement]) => ({
      find: new RegExp(`^${find.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}$`),
      replacement,
    })),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    server: { deps: { inline: [/vendor[\\/]genshin-optimizer/] } },
  },
})
