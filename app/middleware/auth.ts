import type { Context, Next } from 'hono'
import { createAuth } from '../auth'
import type { AppEnv } from '../types'

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) return c.json({ error: 'unauthorized' }, 401)

  c.set('userId', session.user.id)
  c.set('sessionId', session.session.id)

  return next()
}
