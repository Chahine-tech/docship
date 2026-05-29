export interface Env {
  DB: D1Database
  DOCS_KV: KVNamespace
  BUILD_QUEUE: Queue<BuildJob>
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  BETTER_AUTH_SECRET: string
  APP_URL: string
}

export interface BuildJob {
  projectId: string
  versionId: string
  tag: string
  repoOwner: string
  repoName: string
  docsFolder: string
  githubToken: string
}

export interface NavItem {
  title: string
  path?: string
  children?: NavItem[]
  order: number
}

export interface PageContent {
  html: string
  title: string
  headings: { id: string; text: string; level: number }[]
}

export interface GitHubTreeFile {
  path: string
  sha: string
  size: number
  type: 'blob' | 'tree'
}

export interface GitHubTreeResponse {
  sha: string
  tree: GitHubTreeFile[]
  truncated: boolean
}

export interface GitHubPushPayload {
  ref: string
  repository: {
    name: string
    owner: {
      login: string
    }
  }
}

export interface AppVariables {
  userId: string
  sessionId: string
}

export type AppEnv = {
  Bindings: Env
  Variables: AppVariables
}
