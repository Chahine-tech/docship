export interface LlmsFileEntry {
  relativePath: string
  title: string
  urlPath: string
}

interface LlmsTxtOptions {
  projectName: string
  repoOwner: string
  repoName: string
  slug: string
  tag: string
  // relativePath → raw markdown
  docContents: Map<string, string>
  fileEntries: LlmsFileEntry[]
  // repo path → raw markdown (CLAUDE.md, AGENTS.md, .claude/commands/*)
  agentFiles: Map<string, string>
}

export function buildLlmsTxt(opts: LlmsTxtOptions): string {
  const parts: string[] = []

  parts.push(`# ${opts.projectName}`)
  parts.push(``)
  parts.push(`> Source: https://github.com/${opts.repoOwner}/${opts.repoName}`)
  parts.push(`> Version: ${opts.tag}`)
  parts.push(`> Docs: https://docship.app/${opts.slug}/${opts.tag}`)
  parts.push(``)
  parts.push(`---`)
  parts.push(``)

  if (opts.fileEntries.length > 0) {
    parts.push(`## Pages`)
    parts.push(``)
    for (const entry of opts.fileEntries) {
      parts.push(`- [${entry.title}](${entry.urlPath})`)
    }
    parts.push(``)
    parts.push(`---`)
    parts.push(``)

    for (const entry of opts.fileEntries) {
      const content = opts.docContents.get(entry.relativePath)
      if (!content) continue
      parts.push(`## ${entry.title}`)
      parts.push(``)
      parts.push(content.trim())
      parts.push(``)
      parts.push(`---`)
      parts.push(``)
    }
  }

  if (opts.agentFiles.size > 0) {
    parts.push(`## Agent Context`)
    parts.push(``)
    for (const [path, content] of opts.agentFiles) {
      parts.push(`### ${path}`)
      parts.push(``)
      parts.push(content.trim())
      parts.push(``)
    }
  }

  return parts.join('\n')
}
