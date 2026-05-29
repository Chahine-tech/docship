// @ts-nocheck — poolOptions types are injected by @cloudflare/vitest-pool-workers at runtime
// Integration tests run inside the real Cloudflare Workers runtime (miniflare).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['app/**/*.integration.test.ts'],
    pool: '@cloudflare/vitest-pool-workers',
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          d1Databases: { DB: 'test-db' },
          kvNamespaces: ['DOCS_KV'],
        },
      },
    },
  },
})
