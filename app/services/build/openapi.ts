import { parse as parseYaml } from 'yaml'

// Minimal OpenAPI 3.x type surface — enough for reference page generation
interface OASpec {
  info?: { title?: string; version?: string; description?: string }
  tags?: { name: string; description?: string }[]
  paths?: Record<string, OAPathItem>
  components?: { schemas?: Record<string, OASchema> }
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace'

interface OAPathItem extends Partial<Record<HttpMethod, OAOperation>> {
  parameters?: OAParameter[]
}

interface OAOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: OAParameter[]
  requestBody?: OARequestBody
  responses?: Record<string, OAResponse>
  deprecated?: boolean
}

interface OAParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  description?: string
  schema?: OASchema
}

interface OARequestBody {
  required?: boolean
  description?: string
  content?: Record<string, { schema?: OASchema }>
}

interface OAResponse {
  description?: string
  content?: Record<string, { schema?: OASchema }>
}

interface OASchema {
  type?: string
  format?: string
  description?: string
  example?: unknown
  $ref?: string
  enum?: unknown[]
  properties?: Record<string, OASchema>
  items?: OASchema
}

export function parseOpenApiContent(content: string, filename: string): OASpec | null {
  try {
    if (filename.endsWith('.json')) return JSON.parse(content) as OASpec
    return parseYaml(content) as OASpec
  } catch {
    return null
  }
}

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']
const METHOD_COLOR: Record<string, string> = {
  get: '#22c55e', post: '#3b82f6', put: '#f59e0b', patch: '#8b5cf6',
  delete: '#ef4444', head: '#6b7280', options: '#6b7280', trace: '#6b7280',
}

export function renderOpenApiHtml(spec: OASpec): string {
  const h: string[] = []

  const title = spec.info?.title ?? 'API Reference'
  const version = spec.info?.version
  const description = spec.info?.description

  h.push(`<h1>${esc(title)}${version ? ` <small style="font-size:.6em;opacity:.5">v${esc(version)}</small>` : ''}</h1>`)
  if (description) h.push(`<p>${esc(description)}</p>`)

  // Group endpoints by tag
  const tagged = new Map<string, { method: HttpMethod; path: string; op: OAOperation }[]>()
  tagged.set('_untagged', [])

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method]
      if (!op) continue
      const tags = op.tags?.length ? op.tags : ['_untagged']
      for (const tag of tags) {
        if (!tagged.has(tag)) tagged.set(tag, [])
        tagged.get(tag)!.push({ method, path, op })
      }
    }
  }

  // Render tag descriptions from spec.tags
  const tagMeta = Object.fromEntries((spec.tags ?? []).map((t) => [t.name, t.description]))

  for (const [tag, endpoints] of tagged) {
    if (!endpoints.length) continue
    const isUntagged = tag === '_untagged'
    const sectionTitle = isUntagged ? 'Endpoints' : tag

    h.push(`<h2>${esc(sectionTitle)}</h2>`)
    if (!isUntagged && tagMeta[tag]) h.push(`<p>${esc(tagMeta[tag])}</p>`)

    for (const { method, path, op } of endpoints) {
      h.push(renderEndpoint(method, path, op))
    }
  }

  return h.join('\n')
}

function renderEndpoint(method: HttpMethod, path: string, op: OAOperation): string {
  const color = METHOD_COLOR[method] ?? '#6b7280'
  const h: string[] = []

  h.push(`<div class="api-endpoint${op.deprecated ? ' api-deprecated' : ''}">`)

  // Method + path line
  h.push(`<div class="api-method-line">`)
  h.push(`<span class="api-method" style="background:${color}20;color:${color};border-color:${color}40">${method.toUpperCase()}</span>`)
  h.push(`<code class="api-path">${esc(path)}</code>`)
  if (op.deprecated) h.push(`<span class="api-badge-deprecated">deprecated</span>`)
  h.push(`</div>`)

  if (op.summary) h.push(`<p class="api-summary">${esc(op.summary)}</p>`)
  if (op.description && op.description !== op.summary) {
    h.push(`<p class="api-desc">${esc(op.description)}</p>`)
  }

  // Parameters
  const params = op.parameters ?? []
  if (params.length) {
    h.push(`<h4>Parameters</h4>`)
    h.push(`<table class="api-table"><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>`)
    for (const p of params) {
      h.push(`<tr>
        <td><code>${esc(p.name)}</code></td>
        <td>${esc(p.in)}</td>
        <td>${schemaType(p.schema)}</td>
        <td>${p.required ? '✓' : ''}</td>
        <td>${esc(p.description ?? '')}</td>
      </tr>`)
    }
    h.push(`</tbody></table>`)
  }

  // Request body
  if (op.requestBody) {
    h.push(`<h4>Request body${op.requestBody.required ? ' <small>(required)</small>' : ''}</h4>`)
    if (op.requestBody.description) h.push(`<p>${esc(op.requestBody.description)}</p>`)
    const firstContent = Object.entries(op.requestBody.content ?? {})[0]
    if (firstContent) {
      const [mime, { schema }] = firstContent
      h.push(`<p><code>${esc(mime)}</code></p>`)
      if (schema) h.push(renderSchema(schema))
    }
  }

  // Responses
  if (op.responses) {
    h.push(`<h4>Responses</h4>`)
    h.push(`<table class="api-table"><thead><tr><th>Status</th><th>Description</th></tr></thead><tbody>`)
    for (const [status, resp] of Object.entries(op.responses)) {
      h.push(`<tr><td><code>${esc(status)}</code></td><td>${esc(resp.description ?? '')}</td></tr>`)
    }
    h.push(`</tbody></table>`)
  }

  h.push(`</div>`)
  return h.join('\n')
}

function renderSchema(schema: OASchema): string {
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop() ?? schema.$ref
    return `<p>Schema: <code>${esc(name)}</code></p>`
  }
  if (schema.type === 'object' && schema.properties) {
    const rows = Object.entries(schema.properties)
      .map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${schemaType(v)}</td><td>${esc(v.description ?? '')}</td></tr>`)
      .join('')
    return `<table class="api-table"><thead><tr><th>Field</th><th>Type</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>`
  }
  return `<p>Type: <code>${schemaType(schema)}</code></p>`
}

function schemaType(schema?: OASchema): string {
  if (!schema) return ''
  if (schema.$ref) return esc(schema.$ref.split('/').pop() ?? schema.$ref)
  if (schema.type === 'array' && schema.items) return `${schemaType(schema.items)}[]`
  const base = schema.format ? `${schema.type} (${schema.format})` : (schema.type ?? '')
  return esc(base)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
