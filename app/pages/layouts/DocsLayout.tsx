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
      <meta name="color-scheme" content="dark" />
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
            <div class="relative mb-4 px-1">
              <input
                id="doc-search-input"
                type="search"
                placeholder="Search..."
                autocomplete="off"
                data-slug={projectSlug}
                data-version={currentVersion}
                class="w-full h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
              <div
                id="doc-search-results"
                class="hidden absolute top-full left-1 right-1 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto"
              />
            </div>
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

        (function() {
          const input = document.getElementById('doc-search-input');
          const results = document.getElementById('doc-search-results');
          if (!input || !results) return;

          const slug = input.dataset.slug;
          const version = input.dataset.version;
          const urlToken = new URLSearchParams(window.location.search).get('token');

          let timer;
          input.addEventListener('input', function() {
            clearTimeout(timer);
            const q = this.value.trim();
            if (q.length < 2) { results.classList.add('hidden'); return; }
            timer = setTimeout(async () => {
              try {
                const params = new URLSearchParams({ q, version });
                if (urlToken) params.set('token', urlToken);
                const res = await fetch('/docs/' + slug + '/search?' + params);
                const { results: hits } = await res.json();
                if (!hits?.length) {
                  results.innerHTML = '<div class="px-4 py-3 text-sm text-muted-foreground">No results.</div>';
                } else {
                  results.innerHTML = hits.map(r =>
                    '<a href="/docs/' + slug + '/' + version + r.path + (urlToken ? '?token=' + encodeURIComponent(urlToken) : '') + '" class="block px-4 py-2.5 hover:bg-accent border-b border-border last:border-0 transition-colors">' +
                      '<div class="text-sm font-medium truncate">' + r.title + '</div>' +
                      '<div class="text-xs text-muted-foreground line-clamp-2 mt-0.5">' + r.snippet + '</div>' +
                    '</a>'
                  ).join('');
                }
                results.classList.remove('hidden');
              } catch {}
            }, 300);
          });

          document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
              results.classList.add('hidden');
            }
          });
        })();
      `}} />
      <script type="module" dangerouslySetInnerHTML={{ __html: `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });
        for (const el of document.querySelectorAll('code.language-mermaid')) {
          try {
            const id = 'mermaid-' + Math.random().toString(36).slice(2);
            const { svg } = await mermaid.render(id, el.textContent ?? '');
            const div = document.createElement('div');
            div.className = 'my-4 overflow-x-auto';
            div.innerHTML = svg;
            el.parentElement.replaceWith(div);
          } catch {}
        }
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
