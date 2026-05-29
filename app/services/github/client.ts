import type { GitHubTreeResponse, GitHubTreeFile } from '../../types'

const GITHUB_API = 'https://api.github.com'

export class GitHubClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Docship/1.0',
      },
    })

    if (res.status === 403 || res.status === 429) {
      const resetAt = res.headers.get('x-ratelimit-reset')
      const remaining = res.headers.get('x-ratelimit-remaining')
      throw new RateLimitError(
        `GitHub API rate limit hit`,
        resetAt ? Number(resetAt) * 1000 : Date.now() + 60_000,
        Number(remaining ?? 0)
      )
    }

    if (!res.ok) {
      throw new GitHubApiError(`GitHub API error: ${res.status} ${res.statusText}`, res.status)
    }

    return res.json() as Promise<T>
  }

  async resolveTagToCommitSha(owner: string, repo: string, tag: string): Promise<string> {
    const ref = await this.request<{ object: { sha: string; type: string } }>(
      `/repos/${owner}/${repo}/git/ref/tags/${tag}`
    )

    // Lightweight tag → points directly to a commit
    if (ref.object.type === 'commit') return ref.object.sha

    // Annotated tag → dereference to the commit
    const annotated = await this.request<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/tags/${ref.object.sha}`
    )
    return annotated.object.sha
  }

  async getTree(owner: string, repo: string, sha: string): Promise<GitHubTreeResponse> {
    return this.request<GitHubTreeResponse>(
      `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
    )
  }

  async getBlobContent(owner: string, repo: string, sha: string): Promise<string> {
    const blob = await this.request<{ content: string; encoding: string }>(
      `/repos/${owner}/${repo}/git/blobs/${sha}`
    )

    if (blob.encoding === 'base64') {
      return atob(blob.content.replace(/\n/g, ''))
    }
    return blob.content
  }

  // Fetch multiple blobs with capped concurrency to avoid rate limiting
  async getBlobsWithConcurrency(
    owner: string,
    repo: string,
    files: GitHubTreeFile[],
    concurrency = 5
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    let index = 0

    const worker = async () => {
      while (index < files.length) {
        const file = files[index++]
        const content = await this.getBlobContent(owner, repo, file.sha)
        results.set(file.path, content)
      }
    }

    const workers = Array.from(
      { length: Math.min(concurrency, files.length) },
      worker
    )
    await Promise.all(workers)

    return results
  }
}

export class GitHubApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public resetAt: number,
    public remaining: number
  ) {
    super(message)
    this.name = 'RateLimitError'
  }
}
