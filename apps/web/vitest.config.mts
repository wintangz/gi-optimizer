import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { goAliases } from '../../tooling/go-paths.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: resolve(here, 'src/$1') },
      ...Object.entries(goAliases()).map(([k, v]) => ({
        find: new RegExp(`^${k.replace('/', '\\/')}$`),
        replacement: v,
      })),
    ],
  },
  test: {
    environment: 'node',
  },
})

