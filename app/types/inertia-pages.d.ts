// Typed props for each Inertia page — augments the auto-generated pages.gen.ts.
// This file is NOT auto-generated and must be updated manually when page props change.
import type { Plan } from './index'

interface User { name: string; image?: string | null }
interface Project {
  id: string; slug: string; name: string
  repoOwner: string; repoName: string; docsFolder: string
  isPrivate: boolean; customDomain?: string | null; readToken?: string | null
  webhookSecret?: string | null
}
interface Version {
  id: string; tag: string
  status: 'queued' | 'building' | 'ready' | 'error'
  isLatest: boolean; builtAt?: Date | null; errorDetails?: string | null
}

declare module '@hono/inertia' {
  interface InertiaPages {
    'Landing': Record<string, never>
    'Login': Record<string, never>
    'dashboard/Dashboard': {
      user: User
      projects: (Project & { latestTag?: string; latestStatus?: string })[]
    }
    'dashboard/NewProject': {
      user: User
      repos: { name: string; owner: string; private: boolean; description: string | null }[]
      errors?: Record<string, string>
      values?: Record<string, string>
    }
    'dashboard/ProjectDetail': {
      user: User
      project: Project
      versions: Version[]
    }
    'dashboard/ProjectSettings': {
      user: User
      project: Project
      errors?: Record<string, string>
      success?: boolean
    }
    'dashboard/Analytics': {
      user: User
      project: Pick<Project, 'id' | 'slug' | 'name'>
      stats: {
        totalViews: number
        topPages: { path: string; views: number }[]
        topSearches: { query: string; total: number }[]
        dailyViews: { day: string; views: number }[]
      }
    }
    'dashboard/Billing': {
      user: User
      currentPlan: Plan
      projectCount: number
      hasSubscription: boolean
      success?: boolean
    }
    'layouts/AppShell': { user?: User }
    'layouts/DocsLayout': Record<string, never>
  }
}
