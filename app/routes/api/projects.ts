import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { projects, docVersions } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '../../middleware/auth'
import type { AppEnv } from '../../types'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric with dashes'),
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  docsFolder: z.string().default('docs'),
  isPrivate: z.boolean().default(false),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  docsFolder: z.string().optional(),
  customDomain: z.string().nullable().optional(),
  isPrivate: z.boolean().optional(),
})

const projectsRouter = new Hono<AppEnv>()

projectsRouter.use('/*', requireAuth)

// GET /api/projects
projectsRouter.get('/', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .all()

  return c.json(rows)
})

// POST /api/projects
projectsRouter.post('/', zValidator('json', createProjectSchema), async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')
  const input = c.req.valid('json')

  // Ensure slug is unique
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, input.slug))
    .get()

  if (existing) return c.json({ error: 'slug already taken' }, 409)

  const project = {
    id: crypto.randomUUID(),
    userId,
    webhookSecret: generateWebhookSecret(),
    createdAt: new Date(),
    ...input,
  }

  await db.insert(projects).values(project)

  return c.json(project, 201)
})

// GET /api/projects/:id
projectsRouter.get('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')
  const { id } = c.req.param()

  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)

  return c.json(project)
})

// PATCH /api/projects/:id
projectsRouter.patch('/:id', zValidator('json', updateProjectSchema), async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')
  const { id } = c.req.param()
  const input = c.req.valid('json')

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)

  const updated = await db
    .update(projects)
    .set(input)
    .where(eq(projects.id, id))
    .returning()

  return c.json(updated[0])
})

// DELETE /api/projects/:id
projectsRouter.delete('/:id', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')
  const { id } = c.req.param()

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)

  await db.delete(projects).where(eq(projects.id, id))

  return c.body(null, 204)
})

// GET /api/projects/:id/versions
projectsRouter.get('/:id/versions', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')
  const { id } = c.req.param()

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)

  const versions = await db
    .select()
    .from(docVersions)
    .where(eq(docVersions.projectId, id))
    .all()

  return c.json(versions)
})

// POST /api/projects/:id/webhook-secret — rotate the webhook secret
projectsRouter.post('/:id/webhook-secret', async (c) => {
  const db = getDb(c.env.DB)
  const userId = c.get('userId')
  const { id } = c.req.param()

  const project = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .get()

  if (!project) return c.json({ error: 'not found' }, 404)

  const newSecret = generateWebhookSecret()
  await db.update(projects).set({ webhookSecret: newSecret }).where(eq(projects.id, id))

  return c.json({ webhookSecret: newSecret })
})

function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export { projectsRouter }
