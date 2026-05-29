import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '../db/client'
import { users, sessions, accounts, verifications } from '../db/schema'
import type { Env } from '../types'

export function createAuth(env: Env) {
  const db = getDb(env.DB)

  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        // repo scope needed to read private repos
        scope: ['read:user', 'user:email', 'repo'],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24,       // refresh if older than 1 day
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
