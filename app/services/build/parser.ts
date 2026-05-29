import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import type { PageContent } from '../../types'

export interface BuildContext {
  owner: string
  repo: string
  tag: string
  filePath: string    // e.g. "docs/guide.md"
  docsFolder: string  // e.g. "docs"
  slug: string        // e.g. "sqlens"
  version: string     // e.g. "v0.1.0"
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
  .use(rehypeHighlight, { detect: true })
  .use(rehypeStringify)

export async function parseMarkdown(
  content: string,
  title: string,
  ctx?: BuildContext
): Promise<PageContent> {
  const body = content.replace(/^---[\s\S]*?---\r?\n/, '')

  const vfile = await processor.process(body)
  let html = String(vfile)

  if (ctx) {
    html = rewriteAssetUrls(html, ctx)
    html = rewriteDocLinks(html, ctx)
  }

  const headings = extractHeadings(html)
  return { html, title, headings }
}

function rawBase(ctx: BuildContext) {
  return `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${ctx.tag}`
}

function resolveRelative(src: string, ctx: BuildContext): string {
  const dir = ctx.filePath.split('/').slice(0, -1).join('/')
  const base = `${rawBase(ctx)}/${dir}/`
  return new URL(src, base).href
}

// Rewrite src attributes on img, video, source
function rewriteAssetUrls(html: string, ctx: BuildContext): string {
  return html.replace(/(<(?:img|video|source)[^>]+src=")([^"]+)(")/gi, (_m, open, src, close) => {
    if (/^https?:\/\/|^\/\//.test(src)) return open + src + close
    if (src.startsWith('/')) return open + rawBase(ctx) + src + close
    return open + resolveRelative(src, ctx) + close
  })
}

// Rewrite relative .md hrefs to /docs/:slug/:version/:path
function rewriteDocLinks(html: string, ctx: BuildContext): string {
  const docsPrefix = ctx.docsFolder.replace(/\/$/, '') + '/'

  return html.replace(/(<a[^>]+href=")([^"]*\.md(?:#[^"]*)?)(")/gi, (_m, open, href, close) => {
    const [path, hash] = href.split('#')
    const hashStr = hash ? '#' + hash : ''

    if (/^https?:\/\/|^\/\//.test(path)) return open + href + close

    const dir = ctx.filePath.split('/').slice(0, -1).join('/')
    const base = `https://fake/${dir}/`
    const resolved = new URL(path, base).pathname.slice(1)

    const docRelative = resolved.startsWith(docsPrefix)
      ? resolved.slice(docsPrefix.length)
      : resolved

    const urlPath = docRelative.replace(/\.md$/i, '').replace(/\/index$/i, '').replace(/^index$/i, '')

    return open + `/docs/${ctx.slug}/${ctx.version}/${urlPath}${hashStr}` + close
  })
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
