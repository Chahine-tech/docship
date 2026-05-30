import { withSentry, captureException } from '@sentry/cloudflare'
import { Hono } from 'hono'
import { inertia } from '@hono/inertia'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { renderToString } from 'hono/jsx/dom/server'
import type { Context } from 'hono'
import { createAuth } from './auth'
import { getDb } from './db/client'
import { projects, docVersions, pageViews, searchEvents, users } from './db/schema'
import { eq, and, gt, count, desc, sql } from 'drizzle-orm'
import type { Plan, Env } from './types'
import { PLAN_LIMITS } from './types'
import { projectsRouter } from './routes/api/projects'
import { billingRouter } from './routes/api/billing'
import { webhooks } from './routes/webhooks/github'
import { stripeWebhooks } from './routes/webhooks/stripe'
import { GitHubClient } from './services/github/client'
import { decryptToken } from './services/crypto'
import { accounts } from './db/schema'
import { getPage, getNav, getLatestVersion, getAgentContext } from './services/build/kv'
import { queue } from './consumer'
import { rootView } from './root-view'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { DocsLayout } from './pages/layouts/DocsLayout'
import type { AppEnv, NavItem } from './types'

const app = new Hono<AppEnv>()

// Security headers on every response
app.use('*', async (c, next) => {
  await next()
  c.res.headers.set('X-Content-Type-Options', 'nosniff')
  c.res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
})

// Unhandled errors → Sentry
app.onError((err, c) => {
  captureException(err)
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Custom domain middleware — rewrite requests from custom domains to /docs/{slug}/...
app.use('*', async (c, next) => {
  const host = (c.req.header('host') ?? '').split(':')[0]
  const appHostname = (() => { try { return new URL(c.env.APP_URL).hostname } catch { return '' } })()

  if (host && host !== appHostname && !host.match(/^(localhost|127\.)/)) {
    const project = await getDb(c.env.DB)
      .select({ slug: projects.slug })
      .from(projects)
      .where(eq(projects.customDomain, host))
      .get()

    if (project) {
      const reqPath = c.req.path
      // / → /docs/{slug} (will redirect to latest)
      // /v1.0.0/... → /docs/{slug}/v1.0.0/...
      const rewritten = reqPath === '/' ? `/docs/${project.slug}` : `/docs/${project.slug}${reqPath}`
      const newUrl = new URL(c.req.url)
      newUrl.pathname = rewritten
      return app.fetch(new Request(newUrl.toString(), c.req.raw), c.env, c.executionCtx)
    }
  }

  return next()
})

// Inertia middleware only on dashboard routes — not on API or docs
app.use('/dashboard', inertia({ rootView }))
app.use('/projects/*', inertia({ rootView }))
app.use('/billing', inertia({ rootView }))

async function getSession(c: Context<AppEnv>) {
  return createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
}

async function getSessionWithPlan(c: Context<AppEnv>) {
  const session = await getSession(c)
  if (!session) return null
  const planRow = await getDb(c.env.DB)
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get()
  return { session, plan: (planRow?.plan ?? 'free') as Plan }
}

function userProp(session: NonNullable<Awaited<ReturnType<typeof getSession>>>, plan: Plan) {
  return { name: session.user.name, image: session.user.image, plan }
}

// ─── API ─────────────────────────────────────────────────────────────
app.all('/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))
app.route('/api/projects', projectsRouter)
app.route('/api/billing', billingRouter)
app.route('/webhooks/github', webhooks)
app.route('/webhooks/stripe', stripeWebhooks)
app.get('/healthz', (c) => c.json({ ok: true }))

// ─── Public pages (plain SSR, no Inertia) ───────────────────────────
app.get('/', (c) => c.html('<!DOCTYPE html>' + renderToString(<Landing />)))

app.get('/login', async (c) => {
  const session = await getSession(c)
  if (session) return c.redirect('/dashboard')
  return c.html('<!DOCTYPE html>' + renderToString(<Login />))
})

// GitHub OAuth initiation — proxy through Better Auth so Set-Cookie headers are forwarded
app.get('/login/github', async (c) => {
  const req = new Request(new URL('/api/auth/sign-in/social', c.req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: c.req.header('Cookie') ?? '' },
    body: JSON.stringify({ provider: 'github', callbackURL: '/dashboard' }),
  })

  const authRes = await createAuth(c.env).handler(req)

  // Better Auth puts the GitHub OAuth URL directly in the `location` response header
  const githubUrl = authRes.headers.get('location')
  if (!githubUrl) return c.redirect('/login')

  // Forward the state cookie then redirect to GitHub
  const res = new Response(null, { status: 302, headers: { Location: githubUrl } })
  authRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') res.headers.append('set-cookie', value)
  })
  return res
})

// ─── Dashboard (Inertia — c.render()) ───────────────────────────────
app.get('/dashboard', async (c) => {
  const sp = await getSessionWithPlan(c)
  if (!sp) return c.redirect('/login')
  const { session, plan } = sp

  const db = getDb(c.env.DB)
  const rows = await db.select().from(projects).where(eq(projects.userId, session.user.id)).all()

  const enriched = await Promise.all(
    rows.map(async (p) => {
      const latest = await db
        .select({ tag: docVersions.tag, status: docVersions.status })
        .from(docVersions)
        .where(and(eq(docVersions.projectId, p.id), eq(docVersions.isLatest, true)))
        .get()
      return { ...p, latestTag: latest?.tag, latestStatus: latest?.status }
    })
  )

  return c.render('dashboard/Dashboard', {
    user: userProp(session, plan),
    projects: enriched,
  })
})

app.get('/billing', async (c) => {
  const session = await getSession(c)
  if (!session) return c.redirect('/login')

  const db = getDb(c.env.DB)
  const [user, projectCountRow] = await Promise.all([
    db
      .select({ plan: users.plan, stripeSubscriptionId: users.stripeSubscriptionId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .get(),
    db
      .select({ total: count(projects.id) })
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .get(),
  ])

  const billingPlan = (user?.plan ?? 'free') as Plan
  return c.render('dashboard/Billing', {
    user: userProp(session, billingPlan),
    currentPlan: billingPlan,
    projectCount: projectCountRow?.total ?? 0,
    hasSubscription: !!user?.stripeSubscriptionId,
    success: c.req.query('success') === '1',
  })
})

app.get('/projects/new', async (c) => {
  const sp = await getSessionWithPlan(c)
  if (!sp) return c.redirect('/login')
  const { session, plan } = sp

  const db = getDb(c.env.DB)

  // Redirect free users who already hit the limit
  if (PLAN_LIMITS[plan].projects !== Infinity) {
    const projectCount = await db
      .select({ total: count(projects.id) })
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .get()
    if ((projectCount?.total ?? 0) >= PLAN_LIMITS[plan].projects) {
      return c.redirect('/billing?limit=projects')
    }
  }

  const account = await db
    .select({ accessToken: accounts.accessToken })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, 'github')))
    .get()

  let repos: { name: string; owner: string; private: boolean; description: string | null }[] = []
  if (account?.accessToken) {
    try {
      const token = await decryptToken(account.accessToken, c.env.TOKEN_ENCRYPTION_KEY)
      const github = new GitHubClient(token)
      const raw = await github.getUserRepos()
      repos = raw.map((r) => ({
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        description: r.description,
      }))
    } catch { /* fall through with empty repos */ }
  }

  return c.render('dashboard/NewProject', {
    user: userProp(session, plan),
    repos,
  })
})

const createProjectSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  docsFolder: z.string().default('docs'),
})

app.post('/projects/new', async (c) => {
  const session = await getSession(c)
  if (!session) return c.redirect('/login')

  const db = getDb(c.env.DB)

  // Enforce plan project limit
  const userPlan = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get()
  const plan = (userPlan?.plan ?? 'free') as Plan
  const limit = PLAN_LIMITS[plan].projects
  if (limit !== Infinity) {
    const projectCount = await db
      .select({ total: count(projects.id) })
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .get()
    if ((projectCount?.total ?? 0) >= limit) {
      return c.redirect('/billing?limit=projects')
    }
  }

  const form = await c.req.formData()
  const raw = Object.fromEntries(form) as Record<string, string>
  const result = createProjectSchema.safeParse(raw)

  if (!result.success) {
    const errors = Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
    )
    return c.render('dashboard/NewProject', {
      user: userProp(session, plan),
      repos: [],
      errors,
      values: raw,
    })
  }

  const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, result.data.slug)).get()
  if (existing) {
    return c.render('dashboard/NewProject', {
      user: userProp(session, plan),
      repos: [],
      errors: { slug: 'Slug already taken' },
      values: raw,
    })
  }

  const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const project = { id: crypto.randomUUID(), userId: session.user.id, webhookSecret: secret, createdAt: new Date(), ...result.data }
  await db.insert(projects).values(project)
  return c.redirect(`/projects/${project.id}`)
})

app.get('/projects/:id', async (c) => {
  const sp = await getSessionWithPlan(c)
  if (!sp) return c.redirect('/login')
  const { session, plan } = sp

  const db = getDb(c.env.DB)
  const project = await db
    .select().from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, session.user.id)))
    .get()

  if (!project) return c.notFound()

  const versions = await db.select().from(docVersions).where(eq(docVersions.projectId, project.id)).all()

  return c.render('dashboard/ProjectDetail', {
    user: userProp(session, plan),
    project,
    versions,
  })
})

const settingsSchema = z.object({
  name: z.string().min(1).max(100),
  docsFolder: z.string().min(1),
  isPrivate: z.string().optional(),
  customDomain: z.string().optional(),
})

app.get('/projects/:id/settings', async (c) => {
  const sp = await getSessionWithPlan(c)
  if (!sp) return c.redirect('/login')
  const { session, plan } = sp

  const db = getDb(c.env.DB)
  const project = await db
    .select().from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, session.user.id)))
    .get()

  if (!project) return c.notFound()

  return c.render('dashboard/ProjectSettings', {
    user: userProp(session, plan),
    project,
  })
})

app.post('/projects/:id/settings', async (c) => {
  const sp = await getSessionWithPlan(c)
  if (!sp) return c.redirect('/login')
  const { session, plan } = sp

  const db = getDb(c.env.DB)
  const project = await db
    .select().from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, session.user.id)))
    .get()

  if (!project) return c.notFound()

  const form = await c.req.formData()
  const raw = Object.fromEntries(form) as Record<string, string>
  const result = settingsSchema.safeParse(raw)

  if (!result.success) {
    const errors = Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
    )
    return c.render('dashboard/ProjectSettings', {
      user: userProp(session, plan),
      project,
      errors,
    })
  }

  const updated = {
    name: result.data.name,
    docsFolder: result.data.docsFolder,
    isPrivate: result.data.isPrivate === 'true',
    customDomain: result.data.customDomain?.trim() || null,
  }

  await db.update(projects).set(updated).where(eq(projects.id, project.id))

  return c.render('dashboard/ProjectSettings', {
    user: userProp(session, plan),
    project: { ...project, ...updated },
    success: true,
  })
})

app.get('/projects/:id/analytics', async (c) => {
  const sp = await getSessionWithPlan(c)
  if (!sp) return c.redirect('/login')
  const { session, plan } = sp

  const db = getDb(c.env.DB)
  const project = await db
    .select({ id: projects.id, slug: projects.slug, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, session.user.id)))
    .get()

  if (!project) return c.notFound()

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [totalViewsRow, topPages, topSearches, dailyViews] = await Promise.all([
    db
      .select({ total: count(pageViews.id) })
      .from(pageViews)
      .where(and(eq(pageViews.projectId, project.id), gt(pageViews.viewedAt, since30d)))
      .get(),

    db
      .select({ path: pageViews.path, views: count(pageViews.id) })
      .from(pageViews)
      .where(and(eq(pageViews.projectId, project.id), gt(pageViews.viewedAt, since30d)))
      .groupBy(pageViews.path)
      .orderBy(desc(count(pageViews.id)))
      .limit(10)
      .all(),

    db
      .select({ query: searchEvents.query, total: count(searchEvents.id) })
      .from(searchEvents)
      .where(eq(searchEvents.projectId, project.id))
      .groupBy(searchEvents.query)
      .orderBy(desc(count(searchEvents.id)))
      .limit(10)
      .all(),

    db.all(
      sql`SELECT date(viewed_at, 'unixepoch') as day, count(*) as views
          FROM page_views
          WHERE project_id = ${project.id}
            AND viewed_at > unixepoch() - 14 * 86400
          GROUP BY day ORDER BY day`
    ) as Promise<{ day: string; views: number }[]>,
  ])

  return c.render('dashboard/Analytics', {
    user: userProp(session, plan),
    project,
    stats: {
      totalViews: totalViewsRow?.total ?? 0,
      topPages,
      topSearches,
      dailyViews,
    },
  })
})

// ─── Docs (plain SSR, zero Inertia) ─────────────────────────────────

// GET /docs/:slug/llms.txt — agent-friendly context (latest version)
app.get('/docs/:slug/llms.txt', async (c) => {
  const { slug } = c.req.param()
  const db = getDb(c.env.DB)

  const project = await db
    .select({ isPrivate: projects.isPrivate, readToken: projects.readToken })
    .from(projects)
    .where(eq(projects.slug, slug))
    .get()

  if (!project) return c.notFound()
  if (!(await canAccessDocs(c, project))) return c.redirect('/login')

  const latest = await getLatestVersion(c.env.DOCS_KV, slug)
  if (!latest) return c.notFound()

  const text = await getAgentContext(c.env.DOCS_KV, slug, latest)
  if (!text) return c.notFound()

  return c.text(text, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})

// GET /docs/:slug/search — full-text search (JSON)
app.get('/docs/:slug/search', async (c) => {
  const { slug } = c.req.param()
  const q = c.req.query('q')?.trim() ?? ''
  const version = c.req.query('version')

  if (q.length < 2) return c.json({ results: [] })

  const db = getDb(c.env.DB)
  const project = await db
    .select({ id: projects.id, isPrivate: projects.isPrivate, readToken: projects.readToken })
    .from(projects)
    .where(eq(projects.slug, slug))
    .get()

  if (!project) return c.notFound()
  if (!(await canAccessDocs(c, project))) return c.json({ error: 'unauthorized' }, 401)

  const searchVersion = version ?? (await getLatestVersion(c.env.DOCS_KV, slug))
  if (!searchVersion) return c.json({ results: [] })

  const ftsQuery = buildFtsQuery(q)
  if (!ftsQuery) return c.json({ results: [] })

  try {
    const { results } = await c.env.DB
      .prepare(
        `SELECT path, title,
           snippet(doc_search, 4, '<mark>', '</mark>', '…', 32) AS snippet
         FROM doc_search
         WHERE doc_search MATCH ? AND slug = ? AND version = ?
         ORDER BY rank
         LIMIT 10`
      )
      .bind(ftsQuery, slug, searchVersion)
      .all<{ path: string; title: string; snippet: string }>()

    c.executionCtx.waitUntil(
      getDb(c.env.DB).insert(searchEvents).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        query: q,
        resultsCount: results.length,
        searchedAt: new Date(),
      }).catch(() => {})
    )

    return c.json({ results })
  } catch {
    return c.json({ results: [] })
  }
})

app.get('/docs/:slug', async (c) => {
  const latest = await getLatestVersion(c.env.DOCS_KV, c.req.param('slug'))
  if (!latest) return c.notFound()
  return c.redirect(`/docs/${c.req.param('slug')}/${latest}`)
})

app.get('/docs/:slug/:version', async (c) => {
  const { slug, version } = c.req.param()
  const nav = await getNav(c.env.DOCS_KV, slug, version)
  if (!nav || nav.length === 0) return c.notFound()
  const first = findFirstPath(nav)
  if (!first) return c.notFound()
  return c.redirect(`/docs/${slug}/${version}${first}`)
})

app.get('/docs/:slug/:version/*', async (c) => {
  const { slug, version } = c.req.param()
  const prefix = `/docs/${slug}/${version}`
  const path = c.req.path.slice(prefix.length) || '/'

  const db = getDb(c.env.DB)

  const project = await db
    .select({ id: projects.id, isPrivate: projects.isPrivate, readToken: projects.readToken })
    .from(projects)
    .where(eq(projects.slug, slug))
    .get()

  // Check private access before fetching content
  if (project && !(await canAccessDocs(c, project))) return c.redirect('/login')

  const [page, nav] = await Promise.all([
    getPage(c.env.DOCS_KV, slug, version, path),
    getNav(c.env.DOCS_KV, slug, version),
  ])

  if (!page) return c.notFound()

  const versions = project
    ? await db
        .select({ tag: docVersions.tag, isLatest: docVersions.isLatest })
        .from(docVersions)
        .where(and(eq(docVersions.projectId, project.id), eq(docVersions.status, 'ready')))
        .all()
    : []

  const html = renderToString(
    <DocsLayout
      projectSlug={slug}
      projectId={project?.id}
      currentVersion={version}
      versions={versions}
      nav={nav ?? []}
      currentPath={path}
      pageTitle={page.title}
    >
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
    </DocsLayout>
  )

  if (project) {
    c.executionCtx.waitUntil(
      getDb(c.env.DB).insert(pageViews).values({
        id: crypto.randomUUID(),
        projectId: project.id,
        version,
        path,
        viewedAt: new Date(),
      }).catch(() => {})
    )
  }

  const isPrivate = project?.isPrivate ?? false
  return new Response('<!DOCTYPE html>' + html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': isPrivate
        ? 'private, no-store'
        : 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
})

function findFirstPath(nav: NavItem[]): string | undefined {
  for (const item of nav) {
    if (item.path) return item.path
    if (item.children) { const f = findFirstPath(item.children); if (f) return f }
  }
}

function getDocToken(c: Context<AppEnv>): string | undefined {
  const fromQuery = c.req.query('token')
  const auth = c.req.header('Authorization')
  return fromQuery ?? (auth?.startsWith('Bearer ') ? auth.slice(7) : undefined)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return result === 0
}

async function canAccessDocs(
  c: Context<AppEnv>,
  project: { isPrivate: boolean; readToken: string | null }
): Promise<boolean> {
  if (!project.isPrivate) return true
  const token = getDocToken(c)
  if (token && project.readToken && timingSafeEqual(token, project.readToken)) return true
  const session = await getSession(c)
  return session !== null
}

function buildFtsQuery(q: string): string {
  return q
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[^\p{L}\p{N}\-_]/gu, '') + '*')
    .filter((t) => t.length > 1)
    .join(' ')
}

export default withSentry(
  (env) => {
    const e = env as unknown as Env
    return {
      dsn: e.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: e.APP_URL?.includes('localhost') ? 'development' : 'production',
    }
  },
  { fetch: app.fetch, queue: queue as ExportedHandlerQueueHandler }
)
