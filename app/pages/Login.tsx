import type { FC } from 'hono/jsx'
import { Link, ViteClient } from 'vite-ssr-components/hono'

export const Login: FC = () => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Sign in — Docship</title>
      <ViteClient />
      <Link rel="stylesheet" href="/app/styles.css" />
    </head>
    <body class="bg-background text-foreground">
      <div class="min-h-screen flex flex-col items-center justify-center px-4">
        <div class="w-full max-w-sm">
          <div class="text-center mb-8">
            <span class="text-2xl font-bold tracking-tight">docship</span>
            <p class="text-muted-foreground text-sm mt-2">Connect your GitHub repo to get started</p>
          </div>

          <div class="rounded-xl border border-border bg-card p-6 space-y-4">
            <button
              type="button"
              onclick="fetch('/api/auth/sign-in/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'github',callbackURL:'/dashboard'})}).then(r=>r.json()).then(d=>window.location.href=d.url)"
              class="flex items-center justify-center gap-3 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <GithubIcon />
              Continue with GitHub
            </button>

            <p class="text-xs text-muted-foreground text-center leading-relaxed">
              By continuing, you agree to our Terms of Service.
              We request <code class="bg-muted px-1 rounded">repo</code> scope to read your markdown files.
            </p>
          </div>

          <p class="text-center mt-6">
            <a href="/" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </a>
          </p>
        </div>
      </div>
    </body>
  </html>
)

const GithubIcon: FC = () => (
  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
)
