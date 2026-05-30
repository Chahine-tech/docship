import { renderToString } from 'hono/jsx/dom/server'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'
import type { RootView } from '@hono/inertia'
import { renderPage } from './ssr'

const Head = () => (
  <>
    <ViteClient />
    <Link rel="stylesheet" href="/app/styles.css" />
    <Script src="/app/client.tsx" />
  </>
)

export const rootView: RootView = async (page) => {
  const { head, body } = await renderPage(page)
  const headHtml = renderToString(<Head />) + head.join('')
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="color-scheme" content="dark"><title>docship</title>${headHtml}</head><body>${body}</body></html>`
}
