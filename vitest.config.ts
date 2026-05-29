import { defineConfig } from 'vitest/config'

// Unit tests — pure functions, Node environment, no Workers runtime needed
export default defineConfig({
  test: {
    include: ['app/**/*.unit.test.ts'],
    environment: 'node',
  },
})
