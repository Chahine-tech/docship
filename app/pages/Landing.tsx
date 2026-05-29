import type { FC } from 'hono/jsx'
import { Link, ViteClient } from 'vite-ssr-components/hono'

export const Landing: FC = () => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Docship — Docs as Code, versioned automatically</title>
      <ViteClient />
      <Link rel="stylesheet" href="/app/styles.css" />
    </head>
    <body class="bg-background text-foreground">
      {/* Nav */}
      <header class="h-14 border-b border-border flex items-center px-6 max-w-6xl mx-auto gap-6">
        <span class="text-sm font-semibold tracking-tight">docship</span>
        <div class="flex-1" />
        <a href="/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Sign in
        </a>
        <a href="/login" class="inline-flex items-center h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Get started
        </a>
      </header>

      {/* Hero */}
      <section class="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-8">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          Git-native · Edge-hosted · Zero config
        </div>
        <h1 class="text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          Connect your repo.<br />Tag a release.<br />
          <span class="text-muted-foreground">Your docs are live.</span>
        </h1>
        <p class="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Docship reads your <code class="text-foreground bg-muted rounded px-1.5 py-0.5 text-sm">.md</code> files directly from GitHub.
          Push a tag and a new version of your docs is published automatically.
          No CI. No deployment. No config file.
        </p>
        <div class="flex items-center justify-center gap-4">
          <a href="/login" class="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            <GithubIcon />
            Continue with GitHub
          </a>
          <a href="#how" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
            See how it works →
          </a>
        </div>
      </section>

      {/* Demo block */}
      <section class="max-w-3xl mx-auto px-6 pb-20">
        <div class="rounded-xl border border-border bg-card overflow-hidden">
          <div class="border-b border-border bg-sidebar px-4 py-2.5 flex items-center gap-2">
            <div class="flex gap-1.5">
              <span class="h-3 w-3 rounded-full bg-muted"></span>
              <span class="h-3 w-3 rounded-full bg-muted"></span>
              <span class="h-3 w-3 rounded-full bg-muted"></span>
            </div>
            <span class="text-xs text-muted-foreground font-mono ml-2">terminal</span>
          </div>
          <div class="p-6 font-mono text-sm space-y-1">
            <p><span class="text-muted-foreground">$ </span><span class="text-foreground">git tag v2.0.0 && git push --tags</span></p>
            <p class="text-muted-foreground">Enumerating objects: 3, done.</p>
            <p class="text-muted-foreground">...</p>
            <p><span class="text-emerald-400">✓</span> <span class="text-muted-foreground">docship.app/stripe-js/v2.0.0 is live</span></p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how" class="max-w-5xl mx-auto px-6 pb-24">
        <h2 class="text-2xl font-bold text-center mb-12">Everything you need, nothing you don't</h2>
        <div class="grid sm:grid-cols-3 gap-6">
          {[
            { title: 'Zero config', desc: 'Connect your repo, choose the docs folder. That\'s it. No docusaurus.config.js, no CI pipeline, no deploy step.' },
            { title: 'Versioned by tags', desc: 'Push git tag v1.2.0 and a new docs version appears automatically. Switch between versions with a dropdown.' },
            { title: 'Edge-hosted', desc: 'Docs are served from Cloudflare\'s edge network. Fast everywhere, for everyone — no cold starts.' },
          ].map((f) => (
            <div class="rounded-xl border border-border bg-card p-6">
              <h3 class="font-semibold mb-2">{f.title}</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section class="border-t border-border">
        <div class="max-w-2xl mx-auto px-6 py-24 text-center">
          <h2 class="text-3xl font-bold mb-4">Ship better docs, faster.</h2>
          <p class="text-muted-foreground mb-8">Free for one project. No credit card required.</p>
          <a href="/login" class="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            <GithubIcon />
            Get started with GitHub
          </a>
        </div>
      </section>
    </body>
  </html>
)

const GithubIcon: FC = () => (
  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
)
