import { describe, it, expect } from 'vitest'
import { encryptToken, decryptToken } from './crypto'

const SECRET = 'test-secret-key-for-unit-tests'
const TOKEN = 'gho_realGitHubToken1234567890abcdef'

describe('encryptToken / decryptToken', () => {
  it('round-trips a token', async () => {
    const encrypted = await encryptToken(TOKEN, SECRET)
    const decrypted = await decryptToken(encrypted, SECRET)
    expect(decrypted).toBe(TOKEN)
  })

  it('produces different ciphertext each call (random IV)', async () => {
    const a = await encryptToken(TOKEN, SECRET)
    const b = await encryptToken(TOKEN, SECRET)
    expect(a).not.toBe(b)
  })

  it('encrypted value is not the plaintext token', async () => {
    const encrypted = await encryptToken(TOKEN, SECRET)
    expect(encrypted).not.toContain(TOKEN)
  })

  it('fails to decrypt with wrong key', async () => {
    const encrypted = await encryptToken(TOKEN, SECRET)
    await expect(decryptToken(encrypted, 'wrong-key')).rejects.toThrow()
  })

  it('fails on tampered ciphertext', async () => {
    const encrypted = await encryptToken(TOKEN, SECRET)
    const tampered = encrypted.slice(0, -4) + 'XXXX'
    await expect(decryptToken(tampered, SECRET)).rejects.toThrow()
  })

  it('fails on malformed input', async () => {
    await expect(decryptToken('not-valid', SECRET)).rejects.toThrow('malformed encrypted token')
  })
})
