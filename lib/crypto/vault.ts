/**
 * AES-256-GCM encryption utility for tenant restore vault.
 *
 * Uses Node.js crypto module — server-only.
 * Payload format: "v1:<iv_base64>:<authTag_base64>:<ciphertext_base64>"
 *
 * Security:
 *   - IV: 12 bytes (96-bit, NIST SP 800-38D recommended for GCM)
 *   - Auth tag: 16 bytes (128-bit)
 *   - AAD: tenant_id bound as additional authenticated data
 *   - New random IV per encryption (never reused)
 *
 * Key rotation:
 *   - VAULT_ENCRYPTION_KEY  — current active key (used for new encryptions)
 *   - VAULT_ENCRYPTION_KEY_V1, _V2, etc. — retired keys kept for decryption
 *   - Payload version prefix (v1, v2, …) acts as key-id (kid)
 *   - To rotate: set VAULT_ENCRYPTION_KEY to new key, copy old key to
 *     VAULT_ENCRYPTION_KEY_V<N> where N matches the version that used it.
 *     Bump CURRENT_VERSION to the next version (e.g. v2).
 *
 * Requires env: VAULT_ENCRYPTION_KEY (64-char hex = 32 bytes)
 */
import 'server-only'

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV — NIST recommended for GCM
const AUTH_TAG_LENGTH = 16 // 128-bit auth tag
const CURRENT_VERSION = 'v1'

/**
 * Get the encryption key for a specific version.
 * - Current version: reads VAULT_ENCRYPTION_KEY
 * - Retired versions: reads VAULT_ENCRYPTION_KEY_V<n> (e.g. VAULT_ENCRYPTION_KEY_V1)
 *   Falls back to VAULT_ENCRYPTION_KEY if version-specific key is not set
 *   (single-key deployments).
 */
function getEncryptionKeyForVersion(version: string): Buffer {
  // For retired keys, try the version-specific env var first
  if (version !== CURRENT_VERSION) {
    const versionSuffix = version.toUpperCase() // v1 → V1
    const retiredHex = process.env[`VAULT_ENCRYPTION_KEY_${versionSuffix}`]
    if (retiredHex) {
      if (retiredHex.length !== 64) {
        throw new Error(
          `VAULT_ENCRYPTION_KEY_${versionSuffix} must be a 64-character hex string (32 bytes).`
        )
      }
      return Buffer.from(retiredHex, 'hex')
    }
    // Fall through to default key (single-key deployment — no rotation yet)
  }

  const hex = process.env.VAULT_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'VAULT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(hex, 'hex')
}

/** Get the current active encryption key (for new encryptions). */
function getEncryptionKey(): Buffer {
  return getEncryptionKeyForVersion(CURRENT_VERSION)
}

/**
 * Encrypt a JSON-serializable payload.
 * Returns a string: "v1:<iv>:<authTag>:<ciphertext>" (all base64)
 *
 * @param data   — the PII snapshot to encrypt
 * @param tenantId — used as AAD (additional authenticated data) to bind
 *                   the ciphertext to this specific tenant
 */
export function encryptVaultPayload(
  data: Record<string, unknown>,
  tenantId: string,
): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const plaintext = JSON.stringify(data)

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  cipher.setAAD(Buffer.from(tenantId, 'utf8'))

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    CURRENT_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

/**
 * Decrypt a vault payload string back to its original JSON object.
 * Throws if tampered, wrong key, AAD mismatch, or corrupted.
 *
 * @param payload  — the "v1:..." encrypted string
 * @param tenantId — must match the tenantId used during encryption (AAD)
 */
export function decryptVaultPayload(
  payload: string,
  tenantId: string,
): Record<string, unknown> {
  const parts = payload.split(':')
  if (parts.length !== 4) {
    throw new Error('Invalid vault payload format')
  }

  const [version, ivB64, authTagB64, ciphertextB64] = parts
  if (!version.startsWith('v')) {
    throw new Error(`Unsupported vault payload version: ${version}`)
  }

  const key = getEncryptionKeyForVersion(version)
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAAD(Buffer.from(tenantId, 'utf8'))
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>
}
