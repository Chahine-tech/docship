import { describe, it, expect } from 'vitest'
import { verifyGitHubSignature } from './verify'

// Reference HMAC-SHA256 for the test vector
async function makeSignature(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return (
    'sha256=' +
    Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  )
}

describe('verifyGitHubSignature', () => {
  const secret = 'my-webhook-secret'
  const body = '{"ref":"refs/tags/v1.0.0"}'

  it('accepts a valid signature', async () => {
    const sig = await makeSignature(body, secret)
    expect(await verifyGitHubSignature(body, sig, secret)).toBe(true)
  })

  it('rejects a wrong signature', async () => {
    expect(await verifyGitHubSignature(body, 'sha256=deadbeef', secret)).toBe(false)
  })

  it('rejects a null signature', async () => {
    expect(await verifyGitHubSignature(body, null, secret)).toBe(false)
  })

  it('rejects a signature with wrong prefix', async () => {
    const sig = await makeSignature(body, secret)
    expect(await verifyGitHubSignature(body, sig.replace('sha256=', 'md5='), secret)).toBe(false)
  })

  it('rejects a valid signature with tampered body', async () => {
    const sig = await makeSignature(body, secret)
    expect(await verifyGitHubSignature(body + 'x', sig, secret)).toBe(false)
  })

  it('rejects a valid signature with wrong secret', async () => {
    const sig = await makeSignature(body, secret)
    expect(await verifyGitHubSignature(body, sig, 'other-secret')).toBe(false)
  })
})
