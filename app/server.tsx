import { Hono } from 'hono'
import { inertia } from '@hono/inertia'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { renderToString } from 'hono/jsx/dom/server'
import type { Context } from 'hono'
import { createAuth } from './auth'
import { getDb } from './db/client'
import { projects, docVersions } from './db/schema'
import { eq, and } from 'drizzle-orm'
import { projectsRouter } from './routes/api/projects'
import { webhooks } from './routes/webhooks/github'
import { GitHubClient } from './services/github/client'
import { decryptToken } from './services/crypto'
import { accounts } from './db/schema'
import { getPage, getNav, getLatestVersion } from './services/build/kv'
import { queue } from './consumer'
import { rootView } from './root-view'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { DocsLayout } from './pages/layouts/DocsLayout'
import type { AppEnv, NavItem } from './types'

const app = new Hono<AppEnv>()

// Inertia middleware only on dashboard routes — not on API or docs
app.use('/dashboard', inertia({ rootView }))
app.use('/projects/*', inertia({ rootView }))

async function getSession(c: Context<AppEnv>) {
  return createAuth(c.env).api.getSession({ headers: c.req.raw.headers })
}

// ─── API ─────────────────────────────────────────────────────────────
app.all('/api/auth/*', (c) => createAuth(c.env).handler(c.req.raw))
app.route('/api/projects', projectsRouter)
app.route('/webhooks/github', webhooks)
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
  const session = await getSession(c)
  if (!session) return c.redirect('/login')

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
    user: { name: session.user.name, image: session.user.image },
    projects: enriched,
  })
})

app.get('/projects/new', async (c) => {
  const session = await getSession(c)
  if (!session) return c.redirect('/login')

  const db = getDb(c.env.DB)
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
    user: { name: session.user.name, image: session.user.image },
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

  const form = await c.req.formData()
  const raw = Object.fromEntries(form) as Record<string, string>
  const result = createProjectSchema.safeParse(raw)

  if (!result.success) {
    const errors = Object.fromEntries(
      Object.entries(result.error.flatten().fieldErrors).map(([k, v]) => [k, v?.[0] ?? ''])
    )
    return c.render('dashboard/NewProject', {
      user: { name: session.user.name, image: session.user.image },
      repos: [],
      errors,
      values: raw,
    })
  }

  const db = getDb(c.env.DB)
  const existing = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, result.data.slug)).get()
  if (existing) {
    return c.render('dashboard/NewProject', {
      user: { name: session.user.name, image: session.user.image },
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
  const session = await getSession(c)
  if (!session) return c.redirect('/login')

  const db = getDb(c.env.DB)
  const project = await db
    .select().from(projects)
    .where(and(eq(projects.id, c.req.param('id')), eq(projects.userId, session.user.id)))
    .get()

  if (!project) return c.notFound()

  const versions = await db.select().from(docVersions).where(eq(docVersions.projectId, project.id)).all()

  return c.render('dashboard/ProjectDetail', {
    user: { name: session.user.name, image: session.user.image },
    project,
    versions,
  })
})

// ─── Docs (plain SSR, zero Inertia) ─────────────────────────────────
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
  const path = '/' + c.req.param('*')

  const db = getDb(c.env.DB)
  const [page, nav] = await Promise.all([
    getPage(c.env.DOCS_KV, slug, version, path),
    getNav(c.env.DOCS_KV, slug, version),
  ])

  if (!page) return c.notFound()

  const project = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).get()
  const versions = project
    ? await db.select({ tag: docVersions.tag, isLatest: docVersions.isLatest })
        .from(docVersions)
        .where(and(eq(docVersions.projectId, project.id), eq(docVersions.status, 'ready')))
        .all()
    : []

  const html = renderToString(
    <DocsLayout
      projectSlug={slug}
      currentVersion={version}
      versions={versions}
      nav={nav ?? []}
      currentPath={path}
      pageTitle={page.title}
    >
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
    </DocsLayout>
  )

  return new Response('<!DOCTYPE html>' + html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
})

function findFirstPath(nav: NavItem[]): string | undefined {
  for (const item of nav) {
    if (item.path) return item.path
    if (item.children) { const f = findFirstPath(item.children); if (f) return f }
  }
}

export default { fetch: app.fetch, queue }
