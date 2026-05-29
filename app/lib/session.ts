import { createAuth } from '../auth'
import type { Context } from 'hono'
import type { AppEnv } from '../types'

export async function getSession(c: Context<AppEnv>) {
  const auth = createAuth(c.env)
  return auth.api.getSession({ headers: c.req.raw.headers })
}

export async function requireSession(c: Context<AppEnv>) {
  const session = await getSession(c)
  if (!session) {
    c.redirect('/login')
    return null
  }
  return session
}
