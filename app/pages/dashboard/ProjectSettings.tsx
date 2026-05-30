import type { FC } from 'hono/jsx'
import { AppShell } from '../layouts/AppShell'

interface Project {
  id: string
  slug: string
  name: string
  repoOwner: string
  repoName: string
  docsFolder: string
  isPrivate: boolean
  readToken?: string | null
}

interface Props {
  user: { name: string; image?: string | null }
  project: Project
  errors?: Record<string, string>
  success?: boolean
}

const ProjectSettings: FC<Props> = ({ user, project, errors = {}, success }) => (
  <AppShell user={user}>
    <div class="mb-8">
      <a href={`/projects/${project.id}`} class="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4">
        ← {project.name}
      </a>
      <h1 class="text-2xl font-bold">Settings</h1>
      <p class="text-muted-foreground text-sm mt-1">{project.repoOwner}/{project.repoName}</p>
    </div>

    <div class="max-w-lg">
      <form method="post" class="rounded-xl border border-border bg-card p-6 space-y-5">
        {success && (
          <div class="rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm px-4 py-3">
            Settings saved.
          </div>
        )}

        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="name">Project name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={project.name}
            class={`w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.name ? 'border-destructive' : 'border-border'}`}
          />
          {errors.name && <p class="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="docsFolder">Docs folder</label>
          <input
            id="docsFolder"
            name="docsFolder"
            type="text"
            value={project.docsFolder}
            placeholder="docs"
            class={`w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${errors.docsFolder ? 'border-destructive' : 'border-border'}`}
          />
          <p class="text-xs text-muted-foreground">Folder in your repo containing the .md files.</p>
          {errors.docsFolder && <p class="text-xs text-destructive">{errors.docsFolder}</p>}
        </div>

        <div class="flex items-center gap-3">
          <input
            id="isPrivate"
            name="isPrivate"
            type="checkbox"
            value="true"
            checked={project.isPrivate}
            class="h-4 w-4 rounded border-border accent-primary cursor-pointer"
          />
          <label class="text-sm font-medium cursor-pointer" for="isPrivate">Private docs (require login)</label>
        </div>

        <div class="pt-2 flex items-center gap-3">
          <button
            type="submit"
            class="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Save changes
          </button>
          <a href={`/projects/${project.id}`} class="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </a>
        </div>
      </form>

      {/* Read token — separate section, not inside the settings form */}
      <div class="mt-6 rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h2 class="text-sm font-semibold">Read token</h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            Share this token to give read-only access to private docs without requiring a GitHub login.
          </p>
        </div>

        {project.readToken ? (
          <div class="space-y-3">
            <div class="flex gap-2">
              <code
                id="read-token-value"
                class="flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs font-mono flex items-center overflow-x-auto whitespace-nowrap"
              >
                {project.readToken}
              </code>
              <button
                id="copy-token-btn"
                type="button"
                class="h-9 px-3 rounded-md border border-border bg-background text-sm hover:bg-accent transition-colors cursor-pointer shrink-0"
              >
                Copy
              </button>
            </div>
            <p class="text-xs text-muted-foreground">
              Share URL: <code class="font-mono">/docs/{project.slug}?token={project.readToken}</code>
            </p>
            <div class="flex gap-2">
              <button
                id="rotate-token-btn"
                type="button"
                data-project-id={project.id}
                class="h-8 px-3 rounded-md border border-border text-sm hover:bg-accent transition-colors cursor-pointer text-muted-foreground"
              >
                Rotate token
              </button>
              <button
                id="revoke-token-btn"
                type="button"
                data-project-id={project.id}
                class="h-8 px-3 rounded-md border border-destructive/40 text-sm hover:bg-destructive/10 transition-colors cursor-pointer text-destructive"
              >
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <div class="space-y-2">
            <button
              id="generate-token-btn"
              type="button"
              data-project-id={project.id}
              class="h-9 px-4 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
            >
              Generate read token
            </button>
          </div>
        )}
      </div>
    </div>

    <script dangerouslySetInnerHTML={{ __html: `
      document.getElementById('copy-token-btn')?.addEventListener('click', () => {
        const val = document.getElementById('read-token-value')?.textContent ?? '';
        navigator.clipboard.writeText(val.trim());
        const btn = document.getElementById('copy-token-btn');
        if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 1500); }
      });

      async function rotateToken(projectId) {
        await fetch('/api/projects/' + projectId + '/read-token', { method: 'POST' });
        window.location.reload();
      }

      async function revokeToken(projectId) {
        if (!confirm('Revoke token? All shared links will stop working.')) return;
        await fetch('/api/projects/' + projectId + '/read-token', { method: 'DELETE' });
        window.location.reload();
      }

      document.getElementById('generate-token-btn')?.addEventListener('click', function() {
        rotateToken(this.dataset.projectId);
      });
      document.getElementById('rotate-token-btn')?.addEventListener('click', function() {
        rotateToken(this.dataset.projectId);
      });
      document.getElementById('revoke-token-btn')?.addEventListener('click', function() {
        revokeToken(this.dataset.projectId);
      });
    `}} />
  </AppShell>
)

export default ProjectSettings
