import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './app/db/schema.ts',
  out: './app/db/migrations',
  dialect: 'sqlite',
  // For remote D1 (production): use d1-http driver
  // For local dev: just generate SQL, apply with `wrangler d1 execute`
})
