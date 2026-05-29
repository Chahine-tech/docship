// AES-256-GCM encryption for GitHub OAuth tokens at rest.
// The encryption key lives in a Worker secret (TOKEN_ENCRYPTION_KEY), never in D1.
// Format stored in DB: base64(iv):base64(ciphertext)

const SALT = 'docship-token-encryption-v1'
const INFO = 'github-oauth-token'

async function deriveKey(secret: string, usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode(SALT), info: enc.encode(INFO) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  )
}

export async function encryptToken(token: string, secret: string): Promise<string> {
  const key = await deriveKey(secret, 'encrypt')
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token))

  const b64 = (buf: ArrayBuffer | Uint8Array) =>
    btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)))

  return `${b64(iv)}:${b64(ct)}`
}

export async function decryptToken(encrypted: string, secret: string): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(':')
  if (!ivB64 || !ctB64) throw new Error('malformed encrypted token')

  const from64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

  const key = await deriveKey(secret, 'decrypt')
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: from64(ivB64) },
    key,
    from64(ctB64)
  )
  return new TextDecoder().decode(plain)
}
