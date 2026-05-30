import type { FC } from 'hono/jsx'
import { Link, ViteClient } from 'vite-ssr-components/hono'
import { Icon } from '../ui/icon'
import type { LucideIcon } from '../ui/icon'
import {
  Zap, FileText, Search, Bot, Lock, FileCode,
  Globe, ChartBar, ListTree,
} from 'lucide'

export const Landing: FC = () => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="dark" />
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
        <a href="/login/github" class="inline-flex items-center h-8 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Get started free
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
          No Docusaurus. No CI pipeline. No separate repo.<br />
          Docship reads your <code class="text-foreground bg-muted rounded px-1.5 py-0.5 text-sm">.md</code> and <code class="text-foreground bg-muted rounded px-1.5 py-0.5 text-sm">.mdx</code> files from GitHub and publishes a versioned docs site every time you push a tag.
        </p>
        <div class="flex items-center justify-center gap-4">
          <a href="/login/github" class="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            <GithubIcon />
            Continue with GitHub
          </a>
          <a href="#features" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
            See all features →
          </a>
        </div>
      </section>

      {/* Demo block */}
      <section class="max-w-3xl mx-auto px-6 pb-20">
        <div class="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
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
            <p class="text-muted-foreground">To github.com/your-org/your-repo.git</p>
            <p class="text-muted-foreground"> * [new tag]   v2.0.0 → v2.0.0</p>
            <p class="mt-3"><span class="text-emerald-400">✓</span> <span class="text-muted-foreground">docship.app/your-project/v2.0.0 is live</span></p>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" class="max-w-5xl mx-auto px-6 pb-24">
        <h2 class="text-2xl font-bold text-center mb-3">Everything you need. Nothing you don't.</h2>
        <p class="text-center text-muted-foreground mb-12 text-sm">Built for developers who want great docs without the maintenance overhead.</p>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            [
              [Zap,      'Zero config versioning',   'Push a git tag. Docship picks it up via webhook and publishes a new version instantly. No CI, no YAML files.'],
              [FileText, 'MDX + Callouts',            'Write .md or .mdx files. Use <Warning>, <Tip>, <Steps> and :::callout directives out of the box.'],
              [Search,   'Full-text search',          'Built-in search with instant results and keyword highlighting. No Algolia account required.'],
              [Bot,      'Agent-friendly /llms.txt',  'Every doc site exposes /llms.txt — context optimised for AI agents. One URL instead of 50 pages.'],
              [Lock,     'Private docs',              'Make docs private with a single toggle. Share access via read token — no GitHub login required for readers.'],
              [FileCode, 'OpenAPI reference',         'Drop an openapi.yaml in your repo root. Docship auto-generates a full API reference page on every build.'],
              [Globe,    'Custom domain',             'Point a CNAME to docship.app and set it in your project settings. Your docs live at docs.your-app.com.'],
              [ChartBar, 'Analytics',                 'See which pages get the most traffic and what your users are searching for. No third-party scripts.'],
              [ListTree, 'Configurable sidebar',      'Drop a docship.config.json in your repo to control section order, titles, and excluded pages.'],
            ] as [LucideIcon, string, string][]
          ).map(([icon, title, desc]) => (
            <div class="rounded-xl border border-border bg-card p-5">
              <div class="h-8 w-8 rounded-md bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                <Icon icon={icon} size={16} />
              </div>
              <h3 class="font-semibold mb-1.5 text-sm">{title}</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" class="max-w-5xl mx-auto px-6 pb-24">
        <h2 class="text-2xl font-bold text-center mb-3">How it works</h2>
        <p class="text-center text-muted-foreground mb-12 text-sm">Three steps. That's all.</p>
        <div class="grid sm:grid-cols-3 gap-4 relative">
          {[
            {
              step: '01',
              title: 'Connect your repo',
              desc: 'Sign in with GitHub, pick a repo, choose the folder where your .md files live.',
            },
            {
              step: '02',
              title: 'Push a git tag',
              desc: 'git tag v1.0.0 && git push --tags. Docship picks it up via webhook automatically.',
            },
            {
              step: '03',
              title: 'Docs are live',
              desc: 'A versioned docs site is published instantly at docship.app/your-project. Switch versions with a dropdown.',
            },
          ].map((s) => (
            <div class="rounded-xl border border-border bg-card p-6 relative">
              <span class="text-4xl font-bold text-muted/30 absolute top-4 right-5 select-none">{s.step}</span>
              <h3 class="font-semibold mb-2">{s.title}</h3>
              <p class="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* vs table */}
      <section class="max-w-4xl mx-auto px-6 pb-24">
        <h2 class="text-2xl font-bold text-center mb-12">Why not Docusaurus / GitBook?</h2>
        <div class="rounded-xl border border-border overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-sidebar">
                <th class="text-left px-5 py-3 font-medium text-muted-foreground"></th>
                <th class="text-center px-5 py-3 font-semibold">Docship</th>
                <th class="text-center px-5 py-3 font-medium text-muted-foreground">Docusaurus</th>
                <th class="text-center px-5 py-3 font-medium text-muted-foreground">GitBook</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {[
                ['Zero config', '✓', '✗', '✗'],
                ['Auto-versioned by git tag', '✓', '✗', '~'],
                ['Docs live in your repo', '✓', '✓', '✗'],
                ['No CI pipeline needed', '✓', '✗', '✓'],
                ['Edge-hosted, fast everywhere', '✓', '✗', '✗'],
                ['Full-text search built-in', '✓', '~', '✓'],
                ['Private docs with token sharing', '✓', '✗', '✓'],
                ['Custom domain', '✓', '✓', '✓'],
                ['OpenAPI reference page', '✓', '~', '✗'],
                ['Agent-friendly /llms.txt', '✓', '✗', '✗'],
                ['Free to start', '✓', '✓', '~'],
              ].map(([feature, d, doc, gb]) => (
                <tr>
                  <td class="px-5 py-3 text-muted-foreground">{feature}</td>
                  <td class="px-5 py-3 text-center font-medium text-emerald-400">{d}</td>
                  <td class="px-5 py-3 text-center text-muted-foreground">{doc}</td>
                  <td class="px-5 py-3 text-center text-muted-foreground">{gb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pricing */}
      <section class="max-w-4xl mx-auto px-6 pb-24">
        <h2 class="text-2xl font-bold text-center mb-3">Simple pricing</h2>
        <p class="text-center text-muted-foreground mb-12 text-sm">Start free. Upgrade when you need more.</p>
        <div class="grid sm:grid-cols-3 gap-4">
          {[
            {
              name: 'Free',
              price: '€0',
              period: 'forever',
              features: ['1 project', 'Public docs', 'docship.app subdomain', 'Full-text search', 'llms.txt'],
              cta: 'Get started',
              highlight: false,
            },
            {
              name: 'Pro',
              price: '€6',
              period: 'per month',
              features: ['Unlimited projects', 'Private docs', 'Custom domain', 'Analytics', 'OpenAPI reference'],
              cta: 'Start free trial',
              highlight: true,
            },
            {
              name: 'Team',
              price: '€12',
              period: 'per month',
              features: ['Everything in Pro', 'Team members', 'SSO', 'Priority support'],
              cta: 'Contact us',
              highlight: false,
            },
          ].map((plan) => (
            <div class={`rounded-xl border p-6 flex flex-col ${plan.highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'}`}>
              <div class="mb-4">
                <p class="text-sm font-medium text-muted-foreground mb-1">{plan.name}</p>
                <div class="flex items-baseline gap-1">
                  <span class="text-3xl font-bold">{plan.price}</span>
                  <span class="text-sm text-muted-foreground">/{plan.period}</span>
                </div>
              </div>
              <ul class="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li class="text-sm text-muted-foreground flex items-center gap-2">
                    <span class="text-emerald-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="/login/github"
                class={`inline-flex items-center justify-center h-9 rounded-md text-sm font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-accent'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section class="border-t border-border">
        <div class="max-w-2xl mx-auto px-6 py-24 text-center">
          <h2 class="text-3xl font-bold mb-4">Ship better docs, faster.</h2>
          <p class="text-muted-foreground mb-8">Free for one project. No credit card required.</p>
          <a href="/login/github" class="inline-flex items-center gap-2 h-10 px-6 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
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
