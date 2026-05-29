import { describe, it, expect } from 'vitest'
import { buildNavTree, extractFileMetadata } from './navigation'

describe('extractFileMetadata', () => {
  it('reads title from frontmatter', () => {
    const content = `---\ntitle: My Guide\norder: 2\n---\n# Ignored H1\n`
    expect(extractFileMetadata(content, 'guide.md')).toEqual({ title: 'My Guide', order: 2 })
  })

  it('falls back to first H1 when no frontmatter', () => {
    const content = `# Hello World\n\nsome text`
    expect(extractFileMetadata(content, 'hello.md')).toEqual({ title: 'Hello World', order: 0 })
  })

  it('falls back to formatted filename when no frontmatter and no H1', () => {
    const content = `just some text`
    expect(extractFileMetadata(content, 'getting-started.md')).toEqual({
      title: 'Getting Started',
      order: 0,
    })
  })
})

describe('buildNavTree', () => {
  it('builds a flat list for top-level files', () => {
    const files = [
      { path: 'introduction.md', title: 'Introduction', order: 0 },
      { path: 'quickstart.md', title: 'Quickstart', order: 1 },
    ]
    const nav = buildNavTree(files)
    expect(nav).toHaveLength(2)
    expect(nav[0]).toMatchObject({ title: 'Introduction', path: '/introduction' })
    expect(nav[1]).toMatchObject({ title: 'Quickstart', path: '/quickstart' })
  })

  it('nests files under directory nodes', () => {
    const files = [
      { path: 'api/authentication.md', title: 'Authentication', order: 0 },
      { path: 'api/endpoints.md', title: 'Endpoints', order: 1 },
    ]
    const nav = buildNavTree(files)
    expect(nav).toHaveLength(1)
    expect(nav[0].title).toBe('Api')
    expect(nav[0].children).toHaveLength(2)
    expect(nav[0].children![0]).toMatchObject({ title: 'Authentication', path: '/api/authentication' })
  })

  it('sorts items by order then title', () => {
    const files = [
      { path: 'b.md', title: 'B', order: 1 },
      { path: 'a.md', title: 'A', order: 2 },
      { path: 'c.md', title: 'C', order: 0 },
    ]
    const nav = buildNavTree(files)
    expect(nav.map((n) => n.title)).toEqual(['C', 'B', 'A'])
  })

  it('strips index suffix from URL path', () => {
    const files = [{ path: 'guide/index.md', title: 'Guide', order: 0 }]
    const nav = buildNavTree(files)
    expect(nav[0].children![0].path).toBe('/guide')
  })
})
