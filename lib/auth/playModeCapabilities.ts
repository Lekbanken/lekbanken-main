/**
 * User Play Mode Capabilities
 *
 * Determines which play modes a user has access to based on their:
 * - Global role (system_admin gets all)
 * - Tenant membership role
 * - License tier (future)
 *
 * @see features/browse/capabilities.ts for how playModes gate super filters
 */

import type { PlayMode } from '@/lib/game-display';
import type { GlobalRole } from '@/types/auth';
import type { TenantRole } from '@/types/tenant';

/**
 * All available play modes in the system.
 */
export const ALL_PLAY_MODES: PlayMode[] = ['basic', 'facilitated', 'participants'];

/**
 * Play modes available to users without any special access.
 * Intentionally conservative - only basic mode.
 */
export const DEFAULT_PLAY_MODES: PlayMode[] = ['basic'];

/**
 * Context needed to derive user play modes.
 */
export interface PlayModeContext {
  /** User's global role (null for regular users) */
  globalRole: GlobalRole | null;
  /** User's role in current tenant (null if no tenant) */
  tenantRole: TenantRole | null;
  /** Whether user is in demo mode */
  isDemoUser?: boolean;
  // Future: license tier, product subscriptions, etc.
}

/**
 * Derive which play modes a user can access.
 *
 * Current logic (MVP):
 * - system_admin: All modes (for testing)
 * - tenant owner/admin/organisation_admin: All modes (facilitators)
 * - tenant member/editor/organisation_user: basic + facilitated
 * - demo users: basic only
 * - no context: basic only
 *
 * Future: This will be extended to check:
 * - Product licenses (which products user has access to)
 * - Play mode tiers in product metadata
 * - Tenant-level feature flags
 */
export function deriveUserPlayModes(ctx: PlayModeContext): PlayMode[] {
  // Demo users get basic only
  if (ctx.isDemoUser) {
    return ['basic'];
  }

  // System admin gets all modes (for testing super filters)
  if (ctx.globalRole === 'system_admin') {
    return ALL_PLAY_MODES;
  }

  // Tenant owners and admins get all modes (facilitators)
  if (
    ctx.tenantRole === 'owner' ||
    ctx.tenantRole === 'admin' ||
    ctx.tenantRole === 'organisation_admin' ||
    ctx.tenantRole === 'demo_org_admin'
  ) {
    return ALL_PLAY_MODES;
  }

  // Tenant members get basic + facilitated (can join facilitated sessions)
  if (
    ctx.tenantRole === 'member' ||
    ctx.tenantRole === 'editor' ||
    ctx.tenantRole === 'organisation_user' ||
    ctx.tenantRole === 'demo_org_user'
  ) {
    return ['basic', 'facilitated'];
  }

  // Default: basic only
  return DEFAULT_PLAY_MODES;
}

/**
 * Hook-compatible version that can be used in components.
 * Takes raw context values from auth/tenant contexts.
 */
export function getUserPlayModesFromContext(
  globalRole: GlobalRole | null | undefined,
  tenantRole: TenantRole | null | undefined,
  isDemoUser = false
): PlayMode[] {
  return deriveUserPlayModes({
    globalRole: globalRole ?? null,
    tenantRole: tenantRole ?? null,
    isDemoUser,
  });
}
