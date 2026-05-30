import type { FC } from 'hono/jsx'
import { AppShell } from '../layouts/AppShell'

interface Project {
  id: string
  slug: string
  name: string
  repoOwner: string
  repoName: string
  latestTag?: string
  latestStatus?: 'queued' | 'building' | 'ready' | 'error'
}

interface Props {
  user: { name: string; image?: string | null }
  projects: Project[]
}

const Dashboard: FC<Props> = ({ user, projects }) => (
  <AppShell user={user}>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">Projects</h1>
        <p class="text-muted-foreground text-sm mt-1">
          {projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length > 1 ? 's' : ''}`}
        </p>
      </div>
      <a
        href="/projects/new"
        class="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
Connect a repo
      </a>
    </div>

    {projects.length === 0 ? <EmptyState /> : (
      <div class="grid sm:grid-cols-2 gap-4">
        {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
      </div>
    )}
  </AppShell>
)

export default Dashboard

const ProjectCard: FC<{ project: Project }> = ({ project: p }) => (
  <a
    href={`/projects/${p.id}`}
    class="block rounded-xl border border-border bg-card p-5 hover:bg-accent/20 transition-all group"
  >
    <div class="flex items-start gap-3 mb-4">
      <div class="h-8 w-8 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
        <svg class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v.243a2.25 2.25 0 0 1-2.182 2.25H4.432A2.25 2.25 0 0 1 2.25 14.493V14.25" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm">{p.name}</p>
        <p class="text-xs text-muted-foreground mt-0.5">{p.repoOwner}/{p.repoName}</p>
      </div>
    </div>
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">docship.app/{p.slug}</span>
      {p.latestTag ? (
        <StatusBadge status={p.latestStatus ?? 'ready'} tag={p.latestTag} />
      ) : (
        <span class="text-xs text-muted-foreground">No builds yet</span>
      )}
    </div>
  </a>
)

const StatusBadge: FC<{ status: string; tag: string }> = ({ status, tag }) => {
  const dots: Record<string, string> = {
    ready: 'bg-emerald-400 animate-pulse', building: 'bg-blue-400 animate-pulse',
    queued: 'bg-yellow-400', error: 'bg-red-400',
  }
  const colors: Record<string, string> = {
    ready: 'text-emerald-400', building: 'text-blue-400',
    queued: 'text-yellow-400', error: 'text-red-400',
  }
  return (
    <span class={`inline-flex items-center gap-1.5 text-xs font-medium ${colors[status] ?? colors.ready}`}>
      <span class={`h-1.5 w-1.5 rounded-full transition-colors duration-500 \${dots[status] ?? dots.ready}`} />
      {tag}
    </span>
  )
}

const EmptyState: FC = () => (
  <div class="rounded-xl border border-dashed border-border bg-card/50 flex flex-col items-center justify-center py-20 px-6 text-center">
    <div class="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
      <svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    </div>
    <h3 class="font-semibold mb-1">No projects yet</h3>
    <p class="text-sm text-muted-foreground mb-6 max-w-xs">
      Connect a GitHub repo and Docship will publish your docs automatically on each release.
    </p>
    <a href="/projects/new" class="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
      Connect a repo
    </a>
  </div>
)
