import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createAuth } from './auth'
import { projectsRouter } from './routes/api/projects'
import { docsRouter } from './routes/api/docs'
import { webhooks } from './routes/webhooks/github'
import { queue } from './consumer'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

// CORS: reflect origin only if it matches the configured APP_URL or localhost dev ports.
// Using origin:'*' with credentials:true is rejected by all browsers per the Fetch spec.
app.use('*', async (c, next) => {
  const allowedOrigins = [
    c.env.APP_URL,
    'http://localhost:5173',
    'http://localhost:8787',
  ]
  const handler = cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
  return handler(c, next)
})

// Better Auth — handles /api/auth/** (sign-in, callback, session, sign-out…)
app.on(['GET', 'POST'], '/api/auth/**', (c) => {
  const auth = createAuth(c.env)
  return auth.handler(c.req.raw)
})

// Authenticated API
app.route('/api/projects', projectsRouter)

// Docs (public or gated per project — see docsRouter)
app.route('/docs', docsRouter)

// GitHub webhook receiver
app.route('/webhooks/github', webhooks)

app.get('/healthz', (c) => c.json({ ok: true }))

export default {
  fetch: app.fetch,
  queue,
}
