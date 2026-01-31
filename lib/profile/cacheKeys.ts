/**
 * Centralized cache keys for profile-related queries
 * 
 * These keys are used by useProfileQuery to enable single-flight request deduplication.
 * Using consistent keys across components ensures that:
 * 1. The same endpoint is only called once, even from multiple components
 * 2. Navigation between pages doesn't trigger duplicate requests
 * 3. React StrictMode double-renders are handled correctly
 */

export const profileCacheKeys = {
  /** MFA status - used on profile overview and security page */
  mfaStatus: (userId: string) => `mfa-status::${userId}`,
  
  /** MFA trusted devices - used on security page */
  mfaTrustedDevices: (userId: string) => `mfa-devices::${userId}`,
  
  /** User preferences */
  preferences: (userId: string) => `preferences::${userId}`,
  
  /** Privacy settings */
  privacy: (userId: string) => `privacy::${userId}`,
  
  /** Organization memberships */
  organizations: (userId: string) => `organizations::${userId}`,
  
  /** Friends list */
  friends: (userId: string) => `friends::${userId}`,
  
  /** Notification settings */
  notifications: (userId: string) => `notifications::${userId}`,
}
