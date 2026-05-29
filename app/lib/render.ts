import { renderToString } from 'hono/jsx/dom/server'

type HonoElement = Parameters<typeof renderToString>[0]

export function render(component: HonoElement): Response {
  return new Response('<!DOCTYPE html>' + renderToString(component), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
