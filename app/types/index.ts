export type Plan = 'free' | 'pro' | 'team'

export const PLAN_LIMITS: Record<Plan, { projects: number }> = {
  free: { projects: 1 },
  pro:  { projects: Infinity },
  team: { projects: Infinity },
}

export interface Env {
  DB: D1Database
  DOCS_KV: KVNamespace
  BUILD_QUEUE: Queue<BuildJob>
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  BETTER_AUTH_SECRET: string
  TOKEN_ENCRYPTION_KEY: string
  APP_URL: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  STRIPE_PRO_PRICE_ID: string
  STRIPE_TEAM_PRICE_ID: string
}

export interface BuildJob {
  projectId: string
  versionId: string
  userId: string
  tag: string
  repoOwner: string
  repoName: string
  docsFolder: string
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

export interface DocshipSidebarSection {
  title: string
  pages: string[]  // URL paths without leading slash, e.g. "api/authentication"
}

export interface DocshipConfig {
  sidebar?: DocshipSidebarSection[]
  exclude?: string[]  // glob-like path prefixes to hide from nav
}

export interface AppVariables {
  userId: string
  sessionId: string
  customDomainSlug?: string
}

export type AppEnv = {
  Bindings: Env
  Variables: AppVariables
}
