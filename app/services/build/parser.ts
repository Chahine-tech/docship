import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import type { PageContent } from '../../types'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypeHighlight, { detect: true })
  .use(rehypeStringify)

export async function parseMarkdown(
  content: string,
  title: string
): Promise<PageContent> {
  // Strip frontmatter before parsing
  const body = content.replace(/^---[\s\S]*?---\r?\n/, '')

  const vfile = await processor.process(body)
  const html = String(vfile)

  const headings = extractHeadings(html)

  return { html, title, headings }
}

function extractHeadings(
  html: string
): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = []

  // Parse headings from the generated HTML
  const re = /<h([1-6])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null

  while ((match = re.exec(html)) !== null) {
    const level = Number(match[1])
    const id = match[2]
    // Strip inner tags to get plain text
    const text = match[3].replace(/<[^>]+>/g, '').trim()
    headings.push({ id, text, level })
  }

  return headings
}
