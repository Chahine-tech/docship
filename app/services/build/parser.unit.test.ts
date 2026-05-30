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

  describe('callouts', () => {
    it('renders :::warning callout with default title', async () => {
      const content = ':::warning\nThis might break.\n:::'
      const { html } = await parseMarkdown(content, 'Test')
      expect(html).toContain('class="callout callout-warning"')
      expect(html).toContain('class="callout-title"')
      expect(html).toContain('Warning')
      expect(html).toContain('This might break.')
    })

    it('renders :::tip callout with custom label', async () => {
      const content = ':::tip[Pro tip]\nUse the shortcut.\n:::'
      const { html } = await parseMarkdown(content, 'Test')
      expect(html).toContain('class="callout callout-tip"')
      expect(html).toContain('Pro tip')
    })

    it('renders all supported callout types', async () => {
      for (const type of ['note', 'tip', 'warning', 'danger', 'caution', 'info']) {
        const { html } = await parseMarkdown(`:::${type}\ncontent\n:::`, 'Test')
        expect(html).toContain(`callout-${type}`)
      }
    })

    it('ignores unknown directive types', async () => {
      const { html } = await parseMarkdown(':::unknown\ncontent\n:::', 'Test')
      expect(html).not.toContain('callout')
    })
  })
})
