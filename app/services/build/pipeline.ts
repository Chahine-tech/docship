import { GitHubClient } from '../github/client'
import { parseMarkdown } from './parser'
import { buildNavTree, extractFileMetadata } from './navigation'
import { storePage, storeNav, storeLatestVersion } from './kv'
import { getDb } from '../../db/client'
import { docVersions, docPages, projects } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { BuildJob, Env } from '../../types'

export async function runBuildPipeline(job: BuildJob, env: Env): Promise<void> {
  const db = getDb(env.DB)

  await db
    .update(docVersions)
    .set({ status: 'building' })
    .where(eq(docVersions.id, job.versionId))

  try {
    const github = new GitHubClient(job.githubToken)

    // 1. Resolve tag → commit SHA (handles both lightweight and annotated tags)
    const commitSha = await github.resolveTagToCommitSha(
      job.repoOwner,
      job.repoName,
      job.tag
    )

    // 2. Fetch the full recursive tree at this commit
    const tree = await github.getTree(job.repoOwner, job.repoName, commitSha)

    if (tree.truncated) {
      throw new Error(`Git tree is truncated for ${job.repoOwner}/${job.repoName}@${job.tag}. Repo has too many files.`)
    }

    // 3. Filter to markdown files inside the docs folder
    const docsPrefix = job.docsFolder.replace(/\/$/, '') + '/'
    const mdFiles = tree.tree.filter(
      (f) => f.type === 'blob' && f.path.startsWith(docsPrefix) && f.path.endsWith('.md')
    )

    if (mdFiles.length === 0) {
      throw new Error(`No markdown files found in "${job.docsFolder}" at tag ${job.tag}`)
    }

    // 4. Fetch all file contents with bounded concurrency
    const contentMap = await github.getBlobsWithConcurrency(
      job.repoOwner,
      job.repoName,
      mdFiles,
      5
    )

    // 5. Fetch the project slug for KV key construction
    const project = await db
      .select({ slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, job.projectId))
      .get()

    if (!project) throw new Error(`Project ${job.projectId} not found`)

    const slug = project.slug

    // 6. Parse each file and store in KV + D1
    const fileEntries: { path: string; title: string; order: number }[] = []

    const pageInserts: (typeof docPages.$inferInsert)[] = []

    for (const file of mdFiles) {
      const content = contentMap.get(file.path)
      if (!content) continue

      // Path relative to the docs folder, e.g. "api/authentication.md"
      const relativePath = file.path.slice(docsPrefix.length)
      const urlPath = '/' + relativePath.replace(/\.md$/, '').replace(/\/index$/, '')

      const { title, order } = extractFileMetadata(content, relativePath)
      const parsed = await parseMarkdown(content, title)

      const kvKey = `page:${slug}:${job.tag}:${urlPath}`
      await storePage(env.DOCS_KV, slug, job.tag, urlPath, parsed)

      fileEntries.push({ path: relativePath, title, order })

      pageInserts.push({
        id: crypto.randomUUID(),
        versionId: job.versionId,
        path: urlPath,
        title,
        kvKey,
        orderIndex: order,
      })
    }

    // Batch insert all pages into D1
    if (pageInserts.length > 0) {
      await db.insert(docPages).values(pageInserts)
    }

    // 7. Build and store navigation tree
    const navTree = buildNavTree(fileEntries)
    await storeNav(env.DOCS_KV, slug, job.tag, navTree)

    // 8. Determine if this is the latest version
    // A version is "latest" if no later tag exists with status=ready for this project
    const isLatest = await shouldBeLatest(db, job.projectId, job.versionId, job.tag)

    const now = new Date()

    if (isLatest) {
      // Atomically demote the previous latest and promote this one in a single D1 batch
      await db.batch([
        db
          .update(docVersions)
          .set({ isLatest: false })
          .where(
            and(eq(docVersions.projectId, job.projectId), eq(docVersions.isLatest, true))
          ),
        db
          .update(docVersions)
          .set({ status: 'ready', isLatest: true, builtAt: now })
          .where(eq(docVersions.id, job.versionId)),
      ])
      await storeLatestVersion(env.DOCS_KV, slug, job.tag)
    } else {
      await db
        .update(docVersions)
        .set({ status: 'ready', isLatest: false, builtAt: now })
        .where(eq(docVersions.id, job.versionId))
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db
      .update(docVersions)
      .set({ status: 'error', errorDetails: message })
      .where(eq(docVersions.id, job.versionId))
    throw err
  }
}

async function shouldBeLatest(
  db: ReturnType<typeof getDb>,
  projectId: string,
  currentVersionId: string,
  currentTag: string
): Promise<boolean> {
  // Simple semver comparison: if no other "ready" version has a higher tag, we're latest
  // For robustness we do a lexicographic comparison on semver strings which works for
  // well-formed versions like v1.2.3 (pads needed for correct ordering of v1.9 vs v1.10)
  const existing = await db
    .select({ tag: docVersions.tag })
    .from(docVersions)
    .where(
      and(
        eq(docVersions.projectId, projectId),
        eq(docVersions.status, 'ready')
      )
    )
    .all()

  const isNewer = existing.every((v) => compareSemver(currentTag, v.tag) >= 0)
  return isNewer
}

// Returns >0 if a > b, 0 if equal, <0 if a < b
function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)

  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.length, pb.length)

  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
