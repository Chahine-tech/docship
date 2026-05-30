import type { Child, FC } from 'hono/jsx'

interface Props {
  user?: { name: string; image?: string | null; plan?: string }
  children?: Child
}

export const AppShell: FC<Props> = ({ user, children }) => (
  <div class="min-h-screen flex flex-col">
    <header class="h-12 border-b border-border flex items-center px-8 shrink-0">
      <a href="/dashboard" class="text-sm font-semibold tracking-tight">
        docship
      </a>
      {user?.plan && (
        <span class={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium border ${
          user.plan === 'pro'  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
          user.plan === 'team' ? 'bg-primary/10 text-primary border-primary/20' :
                                 'bg-muted text-muted-foreground border-border'
        }`}>
          {user.plan}
        </span>
      )}
      <div class="flex-1" />
      {user && (
        <div class="flex items-center gap-4">
          <span class="text-sm text-muted-foreground">{user.name}</span>
          <div class="w-px h-4 bg-border" />
          <a href="/billing" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Billing
          </a>
          <div class="w-px h-4 bg-border" />
          <button
            type="button"
            onclick="fetch('/api/auth/sign-out',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(()=>location.href='/login')"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer leading-none"
          >
            Sign out
          </button>
        </div>
      )}
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto px-8 py-10">
      {children}
    </main>
  </div>
)
