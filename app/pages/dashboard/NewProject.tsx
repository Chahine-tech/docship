import type { FC } from 'hono/jsx'
import { AppShell } from '../layouts/AppShell'

interface Repo {
  name: string
  owner: string
  private: boolean
  description: string | null
}

interface Props {
  user: { name: string; image?: string | null }
  repos: Repo[]
  errors?: Record<string, string>
}

const NewProject: FC<Props> = ({ user, repos, errors = {} }) => (
  <AppShell user={user}>
    <div class="max-w-xl">
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-6">
        ← Back
      </a>
      <h1 class="text-2xl font-bold mb-1">Connect a repo</h1>
      <p class="text-muted-foreground text-sm mb-8">
        Docship will watch for new tags and publish your docs automatically.
      </p>

      {/* Step 1 — repo picker */}
      <div id="step-pick">
        <input
          type="text"
          placeholder="Search repos..."
          oninput="filterRepos(this.value)"
          class="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-3"
        />
        <div id="repo-list" class="space-y-1.5 max-h-96 overflow-y-auto">
          {repos.map((r) => (
            <button
              key={`${r.owner}/${r.name}`}
              type="button"
              data-repo={`${r.owner}/${r.name}`.toLowerCase()}
              onclick={`selectRepo('${r.owner}','${r.name}')`}
              class="w-full text-left flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/30 transition-colors group"
            >
              <svg class="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v.243a2.25 2.25 0 0 1-2.182 2.25H4.432A2.25 2.25 0 0 1 2.25 14.493V14.25" />
              </svg>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">
                  <span class="text-muted-foreground">{r.owner}/</span>{r.name}
                </p>
                {r.description && (
                  <p class="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>
                )}
              </div>
              {r.private && (
                <span class="text-xs border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
                  Private
                </span>
              )}
            </button>
          ))}
          {repos.length === 0 && (
            <p class="text-sm text-muted-foreground py-4 text-center">
              No repositories found.
            </p>
          )}
        </div>
      </div>

      {/* Step 2 — configure */}
      <div id="step-configure" style="display:none">
        <div class="flex items-center gap-3 mb-6 p-3 rounded-lg border border-border bg-card">
          <svg class="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0v.243a2.25 2.25 0 0 1-2.182 2.25H4.432A2.25 2.25 0 0 1 2.25 14.493V14.25" />
          </svg>
          <span id="selected-display" class="text-sm font-medium flex-1" />
          <button
            type="button"
            onclick="goBack()"
            class="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Change
          </button>
        </div>

        <form method="post" action="/projects/new" class="space-y-4">
          <input type="hidden" name="repoOwner" id="f-owner" />
          <input type="hidden" name="repoName" id="f-name" />

          <Field label="Docs folder" name="docsFolder" id="f-docs" placeholder="docs" defaultValue="docs"
            hint="Folder containing your .md files" error={errors.docsFolder} />

          <Field label="URL slug" name="slug" id="f-slug" placeholder="my-project"
            prefix="docship.app/" error={errors.slug} />

          <button
            type="submit"
            class="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer mt-2"
          >
            Connect repo
          </button>
        </form>
      </div>
    </div>

    <script dangerouslySetInnerHTML={{ __html: `
      function toSlug(s) {
        return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      }

      function selectRepo(owner, name) {
        document.getElementById('f-owner').value = owner
        document.getElementById('f-name').value = name
        document.getElementById('selected-display').textContent = owner + '/' + name
        document.getElementById('f-slug').value = toSlug(name)
        document.getElementById('step-pick').style.display = 'none'
        document.getElementById('step-configure').style.display = 'block'
      }

      function goBack() {
        document.getElementById('step-configure').style.display = 'none'
        document.getElementById('step-pick').style.display = 'block'
      }

      function filterRepos(q) {
        document.querySelectorAll('[data-repo]').forEach(el => {
          el.style.display = el.dataset.repo.includes(q.toLowerCase()) ? '' : 'none'
        })
      }
    `}} />
  </AppShell>
)

export default NewProject

const Field: FC<{
  label: string
  name: string
  id: string
  placeholder?: string
  defaultValue?: string
  prefix?: string
  hint?: string
  error?: string
}> = ({ label, name, id, placeholder, defaultValue, prefix, hint, error }) => (
  <div>
    <label class="text-sm font-medium" for={id}>{label}</label>
    {prefix ? (
      <div class="flex items-center mt-1.5 rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring">
        <span class="px-3 text-sm text-muted-foreground bg-muted border-r border-input h-9 flex items-center shrink-0">
          {prefix}
        </span>
        <input
          id={id}
          name={name}
          type="text"
          placeholder={placeholder}
          value={defaultValue}
          class="flex-1 h-9 px-3 text-sm bg-transparent focus:outline-none"
        />
      </div>
    ) : (
      <input
        id={id}
        name={name}
        type="text"
        placeholder={placeholder}
        value={defaultValue}
        class={`mt-1.5 flex h-9 w-full rounded-md border bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${error ? 'border-destructive' : 'border-input'}`}
      />
    )}
    {hint && !error && <p class="text-xs text-muted-foreground mt-1">{hint}</p>}
    {error && <p class="text-xs text-destructive mt-1">{error}</p>}
  </div>
)
