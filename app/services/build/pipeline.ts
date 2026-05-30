import { GitHubClient } from '../github/client'
import { parseMarkdown } from './parser'
import { buildNavTree, extractFileMetadata } from './navigation'
import { storePage, storeNav, storeLatestVersion, storeAgentContext } from './kv'
import { buildLlmsTxt } from './llms'
import type { LlmsFileEntry } from './llms'
import { parseOpenApiContent, renderOpenApiHtml } from './openapi'
import { decryptToken } from '../crypto'
import { getDb } from '../../db/client'
import { docVersions, docPages, projects, accounts } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { BuildJob, Env, DocshipConfig } from '../../types'

export async function runBuildPipeline(job: BuildJob, env: Env): Promise<void> {
  const db = getDb(env.DB)

  await db
    .update(docVersions)
    .set({ status: 'building' })
    .where(eq(docVersions.id, job.versionId))

  try {
    // Fetch and decrypt the token here, in the consumer — never stored in the queue message
    const account = await db
      .select({ accessToken: accounts.accessToken })
      .from(accounts)
      .where(and(eq(accounts.userId, job.userId), eq(accounts.providerId, 'github')))
      .get()

    if (!account?.accessToken) throw new Error(`No GitHub token found for user ${job.userId}`)

    const githubToken = await decryptToken(account.accessToken, env.TOKEN_ENCRYPTION_KEY)
    const github = new GitHubClient(githubToken)

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
      (f) => f.type === 'blob' && f.path.startsWith(docsPrefix) && /\.(md|mdx)$/i.test(f.path)
    )

    // Also look for root README.md as a fallback homepage
    const rootReadme = tree.tree.find(
      (f) => f.type === 'blob' && /^readme\.md$/i.test(f.path)
    )

    if (mdFiles.length === 0 && !rootReadme) {
      throw new Error(`No markdown files found in "${job.docsFolder}" at tag ${job.tag}`)
    }

    // 4. Fetch all file contents with bounded concurrency
    const filesToFetch = [...mdFiles]
    const hasRootIndex = mdFiles.some((f) => {
      const rel = f.path.slice(docsPrefix.length)
      return /^(index|readme)\.md$/i.test(rel)
    })
    if (rootReadme && !hasRootIndex) filesToFetch.push(rootReadme)

    const contentMap = await github.getBlobsWithConcurrency(
      job.repoOwner,
      job.repoName,
      filesToFetch,
      5
    )

    // 5. Fetch the project slug for KV key construction
    const project = await db
      .select({ slug: projects.slug, name: projects.name })
      .from(projects)
      .where(eq(projects.id, job.projectId))
      .get()

    if (!project) throw new Error(`Project ${job.projectId} not found`)

    const slug = project.slug

    // 6. Parse each file and store in KV + D1
    const fileEntries: { path: string; title: string; order: number }[] = []
    const rawDocsMap = new Map<string, string>()
    const llmsFileEntries: LlmsFileEntry[] = []
    const ftsRows: { path: string; title: string; body: string }[] = []

    const pageInserts: (typeof docPages.$inferInsert)[] = []

    for (const file of filesToFetch) {
      const content = contentMap.get(file.path)
      if (!content) continue

      // Root README.md gets path "/"
      const isRootReadme = rootReadme && file.path === rootReadme.path && !hasRootIndex
      const relativePath = isRootReadme ? 'index.md' : file.path.slice(docsPrefix.length)

      const parts = relativePath.replace(/\.md$/i, '').split('/')
      const lastPart = parts[parts.length - 1].toLowerCase()
      const isIndexFile = lastPart === 'index' || lastPart === 'readme'
      const urlParts = isIndexFile ? parts.slice(0, -1) : parts
      const urlPath = urlParts.length > 0 ? '/' + urlParts.join('/') : '/'

      const isMdx = file.path.endsWith('.mdx')
      const { title, order } = extractFileMetadata(content, relativePath)
      const parsed = await parseMarkdown(content, title, {
        owner: job.repoOwner,
        repo: job.repoName,
        tag: job.tag,
        filePath: isRootReadme ? 'README.md' : file.path,
        docsFolder: job.docsFolder,
        slug,
        version: job.tag,
      }, isMdx)

      const kvKey = `page:${slug}:${job.tag}:${urlPath}`
      await storePage(env.DOCS_KV, slug, job.tag, urlPath, parsed)

      rawDocsMap.set(relativePath, content)
      llmsFileEntries.push({ relativePath, title, urlPath })
      fileEntries.push({ path: relativePath, title, order })
      ftsRows.push({ path: urlPath, title, body: htmlToPlainText(parsed.html) })

      pageInserts.push({
        id: crypto.randomUUID(),
        versionId: job.versionId,
        path: urlPath,
        title,
        kvKey,
        orderIndex: order,
      })
    }

    // 6.5. Check for OpenAPI/Swagger spec at repo root and generate reference page
    const openApiFilePre = tree.tree.find(
      (f) =>
        f.type === 'blob' &&
        /^(openapi|swagger)\.(json|ya?ml)$/i.test(f.path)
    )
    if (openApiFilePre) {
      try {
        const specContent = await github.getBlobContent(job.repoOwner, job.repoName, openApiFilePre.sha)
        const spec = parseOpenApiContent(specContent, openApiFilePre.path)
        if (spec) {
          const apiHtml = renderOpenApiHtml(spec)
          const apiTitle = spec.info?.title ?? 'API Reference'
          const apiPage = { html: apiHtml, title: apiTitle, headings: [] }
          await storePage(env.DOCS_KV, slug, job.tag, '/api-reference', apiPage)
          fileEntries.push({ path: 'api-reference.md', title: apiTitle, order: 9999 })
          pageInserts.push({
            id: crypto.randomUUID(),
            versionId: job.versionId,
            path: '/api-reference',
            title: apiTitle,
            kvKey: `page:${slug}:${job.tag}:/api-reference`,
            orderIndex: 9999,
          })
          ftsRows.push({ path: '/api-reference', title: apiTitle, body: htmlToPlainText(apiHtml) })
          llmsFileEntries.push({ relativePath: 'api-reference.md', title: apiTitle, urlPath: '/api-reference' })
          rawDocsMap.set('api-reference.md', `# ${apiTitle}\n\n${htmlToPlainText(apiHtml).slice(0, 2000)}`)
        }
      } catch { /* malformed spec — skip */ }
    }

    // Batch insert all pages into D1
    if (pageInserts.length > 0) {
      await db.insert(docPages).values(pageInserts)
    }

    // 7. Fetch optional docship.config.json and build navigation tree
    let docshipConfig: DocshipConfig | undefined
    const configFile = tree.tree.find(
      (f) => f.type === 'blob' && /^docship\.config\.json$/i.test(f.path)
    )
    if (configFile) {
      try {
        const raw = await github.getBlobContent(job.repoOwner, job.repoName, configFile.sha)
        docshipConfig = JSON.parse(raw) as DocshipConfig
      } catch { /* malformed config — fall back to auto */ }
    }

    const navTree = buildNavTree(fileEntries, docshipConfig)
    await storeNav(env.DOCS_KV, slug, job.tag, navTree)

    // 8. Index pages into FTS (clear first for idempotent rebuilds)
    await env.DB.prepare('DELETE FROM doc_search WHERE slug = ? AND version = ?')
      .bind(slug, job.tag)
      .run()
    if (ftsRows.length > 0) {
      await env.DB.batch(
        ftsRows.map((row) =>
          env.DB.prepare(
            'INSERT INTO doc_search(slug, version, path, title, body) VALUES (?, ?, ?, ?, ?)'
          ).bind(slug, job.tag, row.path, row.title, row.body)
        )
      )
    }

    // 10. Build and store agent context (llms.txt)
    const agentFilesToFetch = tree.tree.filter(
      (f) =>
        f.type === 'blob' &&
        (/^claude\.md$/i.test(f.path) ||
          /^agents\.md$/i.test(f.path) ||
          /^\.claude\/commands\/.+\.md$/i.test(f.path))
    )
    const agentContentMap =
      agentFilesToFetch.length > 0
        ? await github.getBlobsWithConcurrency(job.repoOwner, job.repoName, agentFilesToFetch, 5)
        : new Map<string, string>()

    const llmsTxt = buildLlmsTxt({
      projectName: project.name,
      repoOwner: job.repoOwner,
      repoName: job.repoName,
      slug,
      tag: job.tag,
      docContents: rawDocsMap,
      fileEntries: llmsFileEntries,
      agentFiles: agentContentMap,
    })
    await storeAgentContext(env.DOCS_KV, slug, job.tag, llmsTxt)

    // 9. Determine if this is the latest version
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

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
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
