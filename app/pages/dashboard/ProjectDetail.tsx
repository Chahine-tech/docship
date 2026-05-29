import type { FC } from 'hono/jsx'
import { AppShell } from '../layouts/AppShell'

interface Version {
  id: string
  tag: string
  status: 'queued' | 'building' | 'ready' | 'error'
  isLatest: boolean
  builtAt?: Date | null
  errorDetails?: string | null
}

interface Project {
  id: string
  slug: string
  name: string
  repoOwner: string
  repoName: string
  docsFolder: string
  webhookSecret?: string | null
}

interface Props {
  user: { name: string; image?: string | null }
  project: Project
  versions: Version[]
}

const ProjectDetail: FC<Props> = ({ user, project, versions }) => (
  <AppShell user={user}>
    <div class="mb-8">
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4">
        ← Projects
      </a>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">{project.name}</h1>
          <p class="text-muted-foreground text-sm mt-1">
            {project.repoOwner}/{project.repoName} · /{project.docsFolder}
          </p>
        </div>
        <div class="flex items-center gap-2">
          {versions.some((v) => v.status === 'ready') && (
            <a
              href={`/docs/${project.slug}`}
              target="_blank"
              class="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border bg-card text-sm hover:bg-accent transition-colors"
            >
              View docs ↗
            </a>
          )}
          <a
            href={`/projects/${project.id}/settings`}
            class="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-border bg-card text-sm hover:bg-accent transition-colors"
          >
            Settings
          </a>
        </div>
      </div>
    </div>

    <div class="grid gap-6">
      {/* Webhook setup */}
      <div class="rounded-xl border border-border bg-card p-6">
        <h2 class="font-semibold mb-1">Webhook setup</h2>
        <p class="text-sm text-muted-foreground mb-4">
          Add this webhook in your GitHub repo settings → Webhooks.
        </p>
        <div class="space-y-3">
          <CopyField label="Payload URL" value="https://docship.app/webhooks/github" />
          {project.webhookSecret && (
            <CopyField label="Secret" value={project.webhookSecret} secret />
          )}
        </div>
        <p class="text-xs text-muted-foreground mt-4">
          Content type: <code class="bg-muted rounded px-1">application/json</code> · Trigger on <strong>Push</strong> events only.
        </p>
      </div>

      {/* Versions */}
      <div class="rounded-xl border border-border bg-card">
        <div class="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 class="font-semibold">Versions</h2>
          <span class="text-sm text-muted-foreground">{versions.length} total</span>
        </div>
        {versions.length === 0 ? (
          <div class="px-6 py-12 text-center text-sm text-muted-foreground">
            No versions yet. Push a git tag to trigger your first build.
          </div>
        ) : (
          <ul class="divide-y divide-border">
            {versions.map((v) => <VersionRow key={v.id} version={v} slug={project.slug} />)}
          </ul>
        )}
      </div>
    </div>
  </AppShell>
)

export default ProjectDetail

const VersionRow: FC<{ version: Version; slug: string }> = ({ version: v, slug }) => {
  const dots: Record<string, string> = {
    ready: 'bg-emerald-400', building: 'bg-blue-400 animate-pulse',
    queued: 'bg-yellow-400', error: 'bg-red-400',
  }
  return (
    <li class="flex items-center gap-4 px-6 py-4">
      <span class={`h-2 w-2 rounded-full shrink-0 ${dots[v.status] ?? dots.ready}`} />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium font-mono">{v.tag}</span>
          {v.isLatest && (
            <span class="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
              latest
            </span>
          )}
        </div>
        {v.builtAt && (
          <p class="text-xs text-muted-foreground mt-0.5">
            {new Date(v.builtAt).toLocaleDateString()}
          </p>
        )}
        {v.errorDetails && (
          <p class="text-xs text-destructive mt-0.5 truncate">{v.errorDetails}</p>
        )}
      </div>
      {v.status === 'ready' && (
        <a href={`/docs/${slug}/${v.tag}`} class="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View →
        </a>
      )}
    </li>
  )
}

const CopyField: FC<{ label: string; value: string; secret?: boolean }> = ({ label, value, secret }) => (
  <div>
    <p class="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
    <div class="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
      <code class="text-xs font-mono flex-1 truncate text-foreground/80">
        {secret ? '••••••••••••••••••••••••••••••••' : value}
      </code>
      <button
        type="button"
        onclick={`navigator.clipboard.writeText('${value}').then(()=>{this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',1500)})`}
        class="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
      >
        Copy
      </button>
    </div>
  </div>
)
