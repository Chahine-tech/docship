import type { NavItem, DocshipConfig } from '../../types'

interface FileEntry {
  path: string       // relative to docsFolder, e.g. "api/authentication.md"
  title: string
  order: number
}

export function buildNavTree(files: FileEntry[], config?: DocshipConfig): NavItem[] {
  // Apply exclusions
  const excluded = config?.exclude ?? []
  const filtered = excluded.length
    ? files.filter((f) => {
        const urlPath = f.path.replace(/\.md$/i, '').replace(/(\/index|\/readme)$/i, '') || '/'
        return !excluded.some((ex) => urlPath === ex || urlPath.startsWith(ex + '/'))
      })
    : files

  // If a sidebar config is provided, build nav in the declared order
  if (config?.sidebar?.length) {
    return buildNavFromConfig(filtered, config.sidebar)
  }

  return buildNavAuto(filtered)
}

function buildNavFromConfig(
  files: FileEntry[],
  sections: NonNullable<DocshipConfig['sidebar']>
): NavItem[] {
  // Build a lookup: urlPath → NavItem leaf
  const byPath = new Map<string, NavItem>()
  for (const file of files) {
    const parts = file.path.replace(/\.md$/i, '').split('/')
    const lastPart = parts[parts.length - 1].toLowerCase()
    const isIndex = lastPart === 'index' || lastPart === 'readme'
    const urlParts = isIndex ? parts.slice(0, -1) : parts
    const urlPath = urlParts.length > 0 ? urlParts.join('/') : ''
    byPath.set(urlPath, { title: file.title, path: '/' + (urlPath || ''), order: file.order })
  }

  const seen = new Set<string>()
  const result: NavItem[] = []

  for (const section of sections) {
    const children: NavItem[] = []
    for (const pagePath of section.pages) {
      const node = byPath.get(pagePath)
      if (node) {
        children.push(node)
        seen.add(pagePath)
      }
    }
    if (children.length === 0) continue
    // Single page section with same title → inline it, no wrapper
    if (children.length === 1 && children[0].title === section.title) {
      result.push({ ...children[0], order: result.length })
    } else {
      result.push({ title: section.title, children, order: result.length })
    }
  }

  // Append remaining pages not covered by config
  for (const [urlPath, node] of byPath) {
    if (!seen.has(urlPath)) result.push({ ...node, order: result.length })
  }

  return result
}

function buildNavAuto(files: FileEntry[]): NavItem[] {
  const root: Map<string, NavItem> = new Map()

  // Sort: directories first, then by order, then alphabetically
  const sorted = [...files].sort((a, b) => {
    const aDirs = a.path.split('/').length
    const bDirs = b.path.split('/').length
    if (aDirs !== bDirs) return aDirs - bDirs
    if (a.order !== b.order) return a.order - b.order
    return a.path.localeCompare(b.path)
  })

  for (const file of sorted) {
    const parts = file.path.replace(/\.md$/i, '').split('/')
    const lastPart = parts[parts.length - 1].toLowerCase()
    const isIndexFile = lastPart === 'index' || lastPart === 'readme'
    const urlParts = isIndexFile ? parts.slice(0, -1) : parts
    const urlPath = urlParts.length > 0 ? '/' + urlParts.join('/') : '/'

    if (parts.length === 1) {
      // Top-level file
      root.set(parts[0], {
        title: file.title,
        path: urlPath,
        order: file.order,
      })
    } else {
      // Nested file — ensure parent directory nodes exist
      const dirKey = parts[0]
      if (!root.has(dirKey)) {
        root.set(dirKey, {
          title: formatDirName(dirKey),
          children: [],
          order: 0,
        })
      }

      let current = root.get(dirKey)!
      for (let i = 1; i < parts.length - 1; i++) {
        if (!current.children) current.children = []
        const existing = current.children.find((c) => c.title === formatDirName(parts[i]))
        if (existing) {
          current = existing
        } else {
          const node: NavItem = { title: formatDirName(parts[i]), children: [], order: 0 }
          current.children.push(node)
          current = node
        }
      }

      if (!current.children) current.children = []
      current.children.push({
        title: file.title,
        path: urlPath,
        order: file.order,
      })
    }
  }

  const result = Array.from(root.values())
  sortNavItems(result)
  return result
} // end buildNavAuto

function sortNavItems(items: NavItem[]): void {
  items.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.title.localeCompare(b.title)
  })
  for (const item of items) {
    if (item.children) sortNavItems(item.children)
  }
}

function formatDirName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// Extract title and order from frontmatter + content
export function extractFileMetadata(content: string, filePath: string): { title: string; order: number } {
  const frontmatter = parseFrontmatter(content)

  const title =
    (frontmatter.title as string | undefined) ??
    extractFirstH1(content) ??
    formatDirName(filePath.split('/').pop()!.replace(/\.md$/, ''))

  const order = Number(frontmatter.order ?? 0)

  return { title, order }
}

function parseFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}

  const result: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const key = line.slice(0, colon).trim()
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '')
    if (key) result[key] = val
  }
  return result
}

function extractFirstH1(content: string): string | undefined {
  // Skip frontmatter block
  const body = content.replace(/^---[\s\S]*?---\r?\n/, '')
  const match = body.match(/^#\s+(.+)$/m)
  return match?.[1]?.trim()
}
