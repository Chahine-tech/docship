import { describe, it, expect } from 'vitest'
import { parseMarkdown } from './parser'

describe('parseMarkdown', () => {
  it('converts basic markdown to HTML', async () => {
    const { html } = await parseMarkdown('# Hello\n\nA paragraph.', 'Hello')
    expect(html).toContain('<h1')
    expect(html).toContain('Hello')
    expect(html).toContain('<p>A paragraph.</p>')
  })

  it('strips frontmatter before parsing', async () => {
    const content = `---\ntitle: My Doc\n---\n# Title\n\nBody.`
    const { html } = await parseMarkdown(content, 'My Doc')
    expect(html).not.toContain('title: My Doc')
    expect(html).toContain('Title')
  })

  it('extracts headings with IDs', async () => {
    const content = `# Section One\n\n## Sub Section`
    const { headings } = await parseMarkdown(content, 'Test')
    expect(headings).toHaveLength(2)
    expect(headings[0]).toMatchObject({ level: 1, text: 'Section One', id: 'section-one' })
    expect(headings[1]).toMatchObject({ level: 2, text: 'Sub Section', id: 'sub-section' })
  })

  it('renders GFM tables', async () => {
    const content = `| A | B |\n|---|---|\n| 1 | 2 |`
    const { html } = await parseMarkdown(content, 'Table')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>')
  })

  it('renders GFM task lists', async () => {
    const content = `- [x] Done\n- [ ] Todo`
    const { html } = await parseMarkdown(content, 'Tasks')
    expect(html).toContain('checked')
  })

  it('highlights code blocks', async () => {
    const content = '```js\nconst x = 1\n```'
    const { html } = await parseMarkdown(content, 'Code')
    expect(html).toContain('<code')
    expect(html).toContain('hljs')
  })
})
