import { Hono } from 'hono'
import { verifyGitHubSignature } from './verify'
import { getDb } from '../../db/client'
import { projects, docVersions, accounts } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { Env, GitHubPushPayload } from '../../types'

const webhooks = new Hono<{ Bindings: Env }>()

webhooks.post('/', async (c) => {
  const event = c.req.header('x-github-event')

  // Ack ping events (sent when webhook is first created)
  if (event === 'ping') return c.json({ ok: true })

  if (event !== 'push') return c.json({ ok: true })

  const body = await c.req.text()
  let payload: GitHubPushPayload
  try {
    payload = JSON.parse(body) as GitHubPushPayload
  } catch {
    return c.json({ error: 'invalid JSON' }, 400)
  }

  // Only handle tag pushes (refs/tags/*)
  if (!payload.ref.startsWith('refs/tags/')) return c.json({ ok: true })

  const tag = payload.ref.replace('refs/tags/', '')
  const repoOwner = payload.repository.owner.login
  const repoName = payload.repository.name

  const db = getDb(c.env.DB)

  // Find the project registered for this repo
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.repoOwner, repoOwner), eq(projects.repoName, repoName)))
    .get()

  if (!project) return c.json({ error: 'project not found' }, 404)

  // Verify HMAC signature using the project's webhook secret
  if (project.webhookSecret) {
    const signature = c.req.header('x-hub-signature-256') ?? null
    const valid = await verifyGitHubSignature(body, signature, project.webhookSecret)
    if (!valid) return c.json({ error: 'invalid signature' }, 401)
  }

  // Idempotency guard: skip if this tag is already queued or built
  const existing = await db
    .select({ id: docVersions.id, status: docVersions.status })
    .from(docVersions)
    .where(and(eq(docVersions.projectId, project.id), eq(docVersions.tag, tag)))
    .get()

  if (existing) {
    return c.json({ message: 'already processed', versionId: existing.id, status: existing.status })
  }

  // Retrieve the owner's GitHub access token (stored by Better Auth)
  const account = await db
    .select({ accessToken: accounts.accessToken })
    .from(accounts)
    .where(and(eq(accounts.userId, project.userId), eq(accounts.providerId, 'github')))
    .get()

  if (!account?.accessToken) {
    return c.json({ error: 'no GitHub token on file for project owner' }, 422)
  }

  // Create the version record and enqueue the build
  const versionId = crypto.randomUUID()

  await db.insert(docVersions).values({
    id: versionId,
    projectId: project.id,
    tag,
    status: 'queued',
    isLatest: false,
    createdAt: new Date(),
  })

  await c.env.BUILD_QUEUE.send({
    projectId: project.id,
    versionId,
    tag,
    repoOwner,
    repoName,
    docsFolder: project.docsFolder,
    githubToken: account.accessToken,
  })

  return c.json({ ok: true, versionId }, 202)
})

export { webhooks }
