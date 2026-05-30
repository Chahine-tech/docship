import type { FC } from 'hono/jsx'
import { AppShell } from '../layouts/AppShell'

interface DailyView { day: string; views: number }
interface TopPage { path: string; views: number }
interface TopSearch { query: string; total: number }

interface Props {
  user: { name: string; image?: string | null }
  project: { id: string; slug: string; name: string }
  stats: {
    totalViews: number
    topPages: TopPage[]
    topSearches: TopSearch[]
    dailyViews: DailyView[]
  }
}

const Analytics: FC<Props> = ({ user, project, stats }) => {
  const maxViews = Math.max(...stats.topPages.map((p) => p.views), 1)
  const maxDailyViews = Math.max(...stats.dailyViews.map((d) => d.views), 1)

  return (
    <AppShell user={user}>
      <div class="mb-8">
        <a href={`/projects/${project.id}`} class="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4">
          ← {project.name}
        </a>
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold">Analytics</h1>
          <span class="text-sm text-muted-foreground">Last 30 days</span>
        </div>
      </div>

      {/* Summary */}
      <div class="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Page views" value={stats.totalViews.toLocaleString()} />
        <StatCard label="Unique queries" value={stats.topSearches.length.toString()} />
      </div>

      {/* Daily views sparkline */}
      {stats.dailyViews.length > 0 && (
        <div class="rounded-xl border border-border bg-card p-6 mb-6">
          <h2 class="text-sm font-semibold mb-4">Views — last 14 days</h2>
          <div class="flex items-end gap-1 h-16">
            {stats.dailyViews.map((d) => (
              <div
                key={d.day}
                class="flex-1 bg-primary/30 hover:bg-primary/50 rounded-sm transition-colors cursor-default"
                style={`height: ${Math.max(4, Math.round((d.views / maxDailyViews) * 64))}px`}
                title={`${d.day}: ${d.views} views`}
              />
            ))}
          </div>
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top pages */}
        <div class="rounded-xl border border-border bg-card">
          <div class="px-6 py-4 border-b border-border">
            <h2 class="text-sm font-semibold">Top pages</h2>
          </div>
          {stats.topPages.length === 0 ? (
            <p class="px-6 py-8 text-sm text-muted-foreground text-center">No views yet.</p>
          ) : (
            <ul class="divide-y divide-border">
              {stats.topPages.map((p) => (
                <li key={p.path} class="px-6 py-3 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <a
                      href={`/docs/${project.slug}${p.path}`}
                      class="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors truncate block"
                    >
                      {p.path}
                    </a>
                    <div class="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        class="h-full bg-primary/50 rounded-full"
                        style={`width: ${Math.round((p.views / maxViews) * 100)}%`}
                      />
                    </div>
                  </div>
                  <span class="text-sm font-medium tabular-nums shrink-0">{p.views}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top searches */}
        <div class="rounded-xl border border-border bg-card">
          <div class="px-6 py-4 border-b border-border">
            <h2 class="text-sm font-semibold">Top searches</h2>
          </div>
          {stats.topSearches.length === 0 ? (
            <p class="px-6 py-8 text-sm text-muted-foreground text-center">No searches yet.</p>
          ) : (
            <ul class="divide-y divide-border">
              {stats.topSearches.map((s) => (
                <li key={s.query} class="px-6 py-3 flex items-center justify-between gap-3">
                  <span class="text-sm font-mono truncate">{s.query}</span>
                  <span class="text-sm text-muted-foreground tabular-nums shrink-0">{s.total}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default Analytics

const StatCard: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div class="rounded-xl border border-border bg-card px-6 py-5">
    <p class="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{label}</p>
    <p class="text-3xl font-bold tabular-nums">{value}</p>
  </div>
)
