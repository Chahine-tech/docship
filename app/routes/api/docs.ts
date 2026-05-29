import { Hono } from 'hono'
import type { Context } from 'hono'
import { getDb } from '../../db/client'
import { projects, docVersions } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { getPage, getNav, getLatestVersion } from '../../services/build/kv'
import { createAuth } from '../../auth'
import type { Env, NavItem } from '../../types'

const docsRouter = new Hono<{ Bindings: Env }>()

async function isAuthenticated(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const auth = createAuth(c.env)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  return session !== null
}

// GET /docs/:slug — resolve to latest version
docsRouter.get('/:slug', async (c) => {
  const { slug } = c.req.param()

  const project = await getDb(c.env.DB)
    .select({ isPrivate: projects.isPrivate })
    .from(projects)
    .where(eq(projects.slug, slug))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)
  if (project.isPrivate && !(await isAuthenticated(c))) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const latest = await getLatestVersion(c.env.DOCS_KV, slug)
  if (!latest) return c.json({ error: 'no published version found' }, 404)

  return c.redirect(`/docs/${slug}/${latest}`, 302)
})

// GET /docs/:slug/:version — index: redirect to first page
docsRouter.get('/:slug/:version', async (c) => {
  const { slug, version } = c.req.param()

  const project = await getDb(c.env.DB)
    .select({ isPrivate: projects.isPrivate })
    .from(projects)
    .where(eq(projects.slug, slug))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)
  if (project.isPrivate && !(await isAuthenticated(c))) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const nav = await getNav(c.env.DOCS_KV, slug, version)
  if (!nav || nav.length === 0) return c.json({ error: 'no pages found' }, 404)

  const firstPath = findFirstPath(nav)
  if (!firstPath) return c.json({ error: 'no page paths found' }, 404)

  return c.redirect(`/docs/${slug}/${version}${firstPath}`, 302)
})

// GET /docs/:slug/:version/* — serve a doc page
docsRouter.get('/:slug/:version/*', async (c) => {
  const { slug, version } = c.req.param()
  const pagePath = '/' + c.req.param('*')

  const db = getDb(c.env.DB)

  const project = await db
    .select({ id: projects.id, isPrivate: projects.isPrivate })
    .from(projects)
    .where(eq(projects.slug, slug))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)
  if (project.isPrivate && !(await isAuthenticated(c))) {
    return c.json({ error: 'unauthorized' }, 401)
  }

  const [page, nav, versions] = await Promise.all([
    getPage(c.env.DOCS_KV, slug, version, pagePath),
    getNav(c.env.DOCS_KV, slug, version),
    db
      .select({ tag: docVersions.tag, isLatest: docVersions.isLatest })
      .from(docVersions)
      .where(and(eq(docVersions.projectId, project.id), eq(docVersions.status, 'ready')))
      .all(),
  ])

  if (!page) return c.json({ error: 'page not found' }, 404)

  return c.json({ page, nav, versions, currentVersion: version, currentPath: pagePath })
})

function findFirstPath(nav: NavItem[]): string | undefined {
  for (const item of nav) {
    if (item.path) return item.path
    if (item.children) {
      const found = findFirstPath(item.children)
      if (found) return found
    }
  }
  return undefined
}

export { docsRouter }
