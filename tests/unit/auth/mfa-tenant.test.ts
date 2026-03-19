import { describe, expect, it } from 'vitest'
import { requireCanonicalMfaTenant } from '@/lib/auth/mfa-tenant'

describe('requireCanonicalMfaTenant', () => {
  it('returns the tenant id when a signed cookie resolved one', () => {
    expect(requireCanonicalMfaTenant('tenant-123', 'trust')).toBe('tenant-123')
  })

  it('throws for trust when no canonical tenant context exists', () => {
    expect(() => requireCanonicalMfaTenant(null, 'trust')).toThrow(
      'No active tenant cookie - cannot trust MFA trusted device'
    )
  })

  it('throws for verify when no canonical tenant context exists', () => {
    expect(() => requireCanonicalMfaTenant(undefined, 'verify')).toThrow(
      'No active tenant cookie - cannot verify MFA trusted device'
    )
  })
})