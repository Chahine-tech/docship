const STRIPE_API = 'https://api.stripe.com/v1'

// Flatten nested objects into Stripe's form-encoded format
// e.g. line_items[0][price] = 'price_xxx'
function flattenParams(params: URLSearchParams, prefix: string, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => flattenParams(params, `${prefix}[${i}]`, item))
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flattenParams(params, `${prefix}[${k}]`, v)
    }
  } else if (value !== undefined && value !== null) {
    params.append(prefix, String(value))
  }
}

export async function stripePost<T>(
  endpoint: string,
  data: Record<string, unknown>,
  secretKey: string
): Promise<T> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(data)) {
    flattenParams(params, k, v)
  }

  const res = await fetch(`${STRIPE_API}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const json = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const msg = (json.error as { message?: string } | undefined)?.message ?? `Stripe ${res.status}`
    throw new Error(msg)
  }
  return json as T
}

export async function stripeGet<T>(endpoint: string, secretKey: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}/${endpoint}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const json = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const msg = (json.error as { message?: string } | undefined)?.message ?? `Stripe ${res.status}`
    throw new Error(msg)
  }
  return json as T
}

// Verify Stripe webhook signature (t=...,v1=... header format)
export async function verifyStripeSignature(
  payload: string,
  sigHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!sigHeader) return false

  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=')))
  const timestamp = parts['t']
  const sig = parts['v1']
  if (!timestamp || !sig) return false

  const signed = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed))
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison
  if (computed.length !== sig.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ sig.charCodeAt(i)
  return diff === 0
}

export interface StripeCheckoutSession {
  id: string
  url: string
  customer: string | null
  subscription: string | null
  metadata: Record<string, string>
}

export interface StripePortalSession {
  id: string
  url: string
}

export interface StripeSubscription {
  id: string
  status: string
  customer: string
  items: { data: { price: { id: string } }[] }
}

export interface StripeEvent {
  id: string
  type: string
  data: { object: Record<string, unknown> }
}
