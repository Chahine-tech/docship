import type { PageContent, NavItem } from '../../types'

// Key schema:
//   page:{slug}:{version}:{path}  → PageContent JSON
//   nav:{slug}:{version}          → NavItem[] JSON
//   meta:{slug}:latest            → { version: string } JSON

export function pageKey(slug: string, version: string, path: string): string {
  return `page:${slug}:${version}:${path}`
}

export function navKey(slug: string, version: string): string {
  return `nav:${slug}:${version}`
}

export function latestKey(slug: string): string {
  return `meta:${slug}:latest`
}

export async function storePage(
  kv: KVNamespace,
  slug: string,
  version: string,
  path: string,
  content: PageContent
): Promise<void> {
  await kv.put(pageKey(slug, version, path), JSON.stringify(content))
}

export async function storeNav(
  kv: KVNamespace,
  slug: string,
  version: string,
  nav: NavItem[]
): Promise<void> {
  await kv.put(navKey(slug, version), JSON.stringify(nav))
}

export async function storeLatestVersion(
  kv: KVNamespace,
  slug: string,
  version: string
): Promise<void> {
  await kv.put(latestKey(slug), JSON.stringify({ version }))
}

export async function getPage(
  kv: KVNamespace,
  slug: string,
  version: string,
  path: string
): Promise<PageContent | null> {
  const raw = await kv.get(pageKey(slug, version, path))
  if (!raw) return null
  return JSON.parse(raw) as PageContent
}

export async function getNav(
  kv: KVNamespace,
  slug: string,
  version: string
): Promise<NavItem[] | null> {
  const raw = await kv.get(navKey(slug, version))
  if (!raw) return null
  return JSON.parse(raw) as NavItem[]
}

export async function getLatestVersion(
  kv: KVNamespace,
  slug: string
): Promise<string | null> {
  const raw = await kv.get(latestKey(slug))
  if (!raw) return null
  return (JSON.parse(raw) as { version: string }).version
}

// Key schema: llms:{slug}:{version} → plain text llms.txt
export function llmsKey(slug: string, version: string): string {
  return `llms:${slug}:${version}`
}

export async function storeAgentContext(
  kv: KVNamespace,
  slug: string,
  version: string,
  text: string
): Promise<void> {
  await kv.put(llmsKey(slug, version), text)
}

export async function getAgentContext(
  kv: KVNamespace,
  slug: string,
  version: string
): Promise<string | null> {
  return kv.get(llmsKey(slug, version))
}
