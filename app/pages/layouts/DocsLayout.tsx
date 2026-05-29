import type { Child, FC } from 'hono/jsx'
import { Link, ViteClient } from 'vite-ssr-components/hono'
import type { NavItem } from '../../types'

interface Props {
  projectSlug: string
  projectId?: string
  currentVersion: string
  versions: { tag: string; isLatest: boolean }[]
  nav: NavItem[]
  currentPath: string
  pageTitle: string
  children?: Child
}

export const DocsLayout: FC<Props> = ({
  projectSlug, projectId, currentVersion, versions, nav, currentPath, pageTitle, children,
}) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{pageTitle} — {projectSlug}</title>
      <ViteClient />
      <Link rel="stylesheet" href="/app/styles.css" />
    </head>
    <body class="bg-background text-foreground">
      <div class="min-h-screen flex flex-col">
        {/* Header */}
        <header class="h-14 border-b border-border bg-sidebar flex items-center px-6 gap-4 shrink-0 sticky top-0 z-10 backdrop-blur-sm">
          <a href={projectId ? `/projects/${projectId}` : `/docs/${projectSlug}`} class="text-sm font-semibold tracking-tight">
            {projectSlug}
          </a>
          <div class="flex-1" />
          <select
            id="version-switcher"
            data-slug={projectSlug}
            class="h-8 rounded-md border border-border bg-card text-sm px-2 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {versions.map((v) => (
              <option value={v.tag} selected={v.tag === currentVersion}>
                {v.tag}{v.isLatest ? ' (latest)' : ''}
              </option>
            ))}
          </select>
        </header>

        <div class="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside class="w-60 shrink-0 border-r border-border bg-sidebar overflow-y-auto py-6 px-3 hidden lg:block">
            <SidebarNav items={nav} slug={projectSlug} version={currentVersion} currentPath={currentPath} />
          </aside>

          {/* Content */}
          <div class="flex-1 min-w-0 overflow-y-auto">
            <div class="max-w-3xl mx-auto px-8 py-10">
              <article class="prose">{children}</article>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('version-switcher')?.addEventListener('change', function() {
          window.location.href = '/docs/' + this.dataset.slug + '/' + this.value;
        });
      `}} />
    </body>
  </html>
)

const SidebarNav: FC<{
  items: NavItem[]
  slug: string
  version: string
  currentPath: string
  depth?: number
}> = ({ items, slug, version, currentPath, depth = 0 }) => (
  <ul class={`space-y-0.5 ${depth > 0 ? 'pl-3 mt-1 border-l border-border ml-2' : ''}`}>
    {items.map((item) => (
      <li key={item.path ?? item.title}>
        {item.path ? (
          <a
            href={`/docs/${slug}/${version}${item.path}`}
            class={`flex items-center rounded-md px-2 py-1.5 text-sm transition-colors ${
              item.path === currentPath
                ? 'bg-accent text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            {item.title}
          </a>
        ) : (
          <p class="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 first:mt-0">
            {item.title}
          </p>
        )}
        {item.children && item.children.length > 0 && (
          <SidebarNav items={item.children} slug={slug} version={version} currentPath={currentPath} depth={depth + 1} />
        )}
      </li>
    ))}
  </ul>
)
