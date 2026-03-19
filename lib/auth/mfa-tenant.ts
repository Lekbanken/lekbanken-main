export function requireCanonicalMfaTenant(
  tenantId: string | null | undefined,
  action: 'trust' | 'verify' = 'verify'
): string {
  if (!tenantId) {
    throw new Error(`No active tenant cookie - cannot ${action} MFA trusted device`)
  }

  return tenantId
}