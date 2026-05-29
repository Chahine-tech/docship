import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '../db/client'
import { users, sessions, accounts, verifications } from '../db/schema'
import { encryptToken, decryptToken } from '../services/crypto'
import type { Env } from '../types'

export function createAuth(env: Env) {
  const db = getDb(env.DB)

  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        scope: ['read:user', 'user:email', 'repo'],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    // Encrypt GitHub OAuth tokens before they hit D1.
    // If the database is ever compromised, tokens are useless without TOKEN_ENCRYPTION_KEY.
    databaseHooks: {
      account: {
        create: {
          before: async (account) => {
            if (account.accessToken) {
              account.accessToken = await encryptToken(account.accessToken, env.TOKEN_ENCRYPTION_KEY)
            }
            if (account.refreshToken) {
              account.refreshToken = await encryptToken(account.refreshToken, env.TOKEN_ENCRYPTION_KEY)
            }
            return { data: account }
          },
        },
        update: {
          before: async (account) => {
            if (account.accessToken && typeof account.accessToken === 'string') {
              account.accessToken = await encryptToken(account.accessToken, env.TOKEN_ENCRYPTION_KEY)
            }
            if (account.refreshToken && typeof account.refreshToken === 'string') {
              account.refreshToken = await encryptToken(account.refreshToken, env.TOKEN_ENCRYPTION_KEY)
            }
            return { data: account }
          },
        },
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

// Call this wherever you need the plaintext GitHub token (webhook handler, build pipeline)
export async function getDecryptedGithubToken(
  encryptedToken: string,
  encryptionKey: string
): Promise<string> {
  return decryptToken(encryptedToken, encryptionKey)
}
