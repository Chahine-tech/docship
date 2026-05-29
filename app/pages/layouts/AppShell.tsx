import type { Child, FC } from 'hono/jsx'

interface Props {
  user?: { name: string; image?: string | null }
  children?: Child
}

export const AppShell: FC<Props> = ({ user, children }) => (
  <div class="min-h-screen flex flex-col">
    <header class="h-12 border-b border-border flex items-center px-8 shrink-0">
      <a href="/dashboard" class="text-sm font-semibold tracking-tight">
        docship
      </a>
      <div class="flex-1" />
      {user && (
        <div class="flex items-center gap-4">
          <span class="text-sm text-muted-foreground">{user.name}</span>
          <div class="w-px h-4 bg-border" />
          <form method="post" action="/api/auth/sign-out" class="flex items-center">
            <button type="submit" class="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer leading-none">
              Sign out
            </button>
          </form>
        </div>
      )}
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto px-8 py-10">
      {children}
    </main>
  </div>
)
