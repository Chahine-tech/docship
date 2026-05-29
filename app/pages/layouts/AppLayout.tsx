import type { Child, FC } from 'hono/jsx'
import { Link, ViteClient } from 'vite-ssr-components/hono'

interface Props {
  title?: string
  user?: { name: string; image?: string | null }
  children?: Child
}

export const AppLayout: FC<Props> = ({ title = 'Dashboard', user, children }) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title} — Docship</title>
      <ViteClient />
      <Link rel="stylesheet" href="/app/styles.css" />
    </head>
    <body class="bg-background text-foreground">
      <div class="min-h-screen flex flex-col">
        <header class="h-14 border-b border-border bg-sidebar flex items-center px-6 gap-6 shrink-0">
          <a href="/dashboard" class="text-sm font-semibold tracking-tight">
            docship
          </a>
          <nav class="flex-1 flex items-center gap-1">
            <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
              Projects
            </a>
          </nav>
          {user && (
            <div class="flex items-center gap-3">
              <span class="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
              <form method="post" action="/api/auth/sign-out">
                <button type="submit" class="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </header>
        <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </body>
  </html>
)
