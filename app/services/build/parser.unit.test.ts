import { describe, it, expect } from 'vitest'
import { parseMarkdown, preprocessMdx } from './parser'

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

  describe('MDX preprocessing', () => {
    it('strips ESM imports and exports', () => {
      const mdx = `import Foo from './foo'\nexport const bar = 1\n\n# Title`
      expect(preprocessMdx(mdx)).not.toContain('import')
      expect(preprocessMdx(mdx)).not.toContain('export')
      expect(preprocessMdx(mdx)).toContain('# Title')
    })

    it('converts <Callout type="warning"> to callout directive', () => {
      const mdx = `<Callout type="warning">Be careful</Callout>`
      expect(preprocessMdx(mdx)).toContain(':::warning')
      expect(preprocessMdx(mdx)).toContain('Be careful')
    })

    it('converts <Callout> with title attribute', () => {
      const mdx = `<Callout type="tip" title="Pro tip">Use shortcuts</Callout>`
      const result = preprocessMdx(mdx)
      expect(result).toContain(':::tip[Pro tip]')
      expect(result).toContain('Use shortcuts')
    })

    it('converts shorthand <Warning>, <Tip>, <Note> tags', () => {
      expect(preprocessMdx('<Warning>Oops</Warning>')).toContain(':::warning')
      expect(preprocessMdx('<Tip>Nice</Tip>')).toContain(':::tip')
      expect(preprocessMdx('<Note>FYI</Note>')).toContain(':::note')
    })

    it('unwraps <CodeGroup> keeping code blocks', () => {
      const mdx = '<CodeGroup>\n```js\nconst x = 1\n```\n</CodeGroup>'
      const result = preprocessMdx(mdx)
      expect(result).not.toContain('<CodeGroup>')
      expect(result).toContain('```js')
    })

    it('strips self-closing unknown JSX components', () => {
      const mdx = 'Hello <MyComponent prop="x" /> world'
      expect(preprocessMdx(mdx)).not.toContain('<MyComponent')
    })

    it('parses .mdx file end-to-end via parseMarkdown(isMdx=true)', async () => {
      const mdx = `import Foo from './foo'\n\n# Guide\n\n<Warning>Read this first.</Warning>\n\nRegular paragraph.`
      const { html } = await parseMarkdown(mdx, 'Guide', undefined, true)
      expect(html).toContain('<h1')
      expect(html).toContain('callout-warning')
      expect(html).toContain('Read this first.')
      expect(html).toContain('Regular paragraph.')
      expect(html).not.toContain('import')
    })
  })
})
