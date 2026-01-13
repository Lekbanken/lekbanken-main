/**
 * Demo Mode Detection Utilities
 * Purpose: Server-side detection of demo mode for conditional rendering/logic
 * Usage: Import and call from Server Components or API routes
 */

import { createServerRlsClient } from '@/lib/supabase/server';
import { cookies, headers } from 'next/headers';
import type { DemoTier } from '@/lib/auth/ephemeral-users';

/**
 * Demo session details returned by getDemoSession()
 */
export interface DemoSessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  tier: DemoTier;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
  converted: boolean;
  timeRemaining: number; // milliseconds
}

/**
 * Check if current request is in demo mode
 * Can be called from Server Components or API routes
 *
 * @returns true if user is in active demo session
 */
export async function isDemoMode(): Promise<boolean> {
  try {
    const supabase = await createServerRlsClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return false;
    }

    // Check if user has demo flags
    const { data: profile } = await supabase
      .from('users')
      .select('is_demo_user, is_ephemeral')
      .eq('id', user.id)
      .single();

    if (!profile || (!profile.is_demo_user && !profile.is_ephemeral)) {
      return false;
    }

    // Verify there's an active demo session
    const { data: demoSession } = await supabase
      .from('demo_sessions')
      .select('expires_at, ended_at')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!demoSession) {
      return false;
    }

    // Check if session is expired
    const expiresAt = new Date(demoSession.expires_at);
    const now = new Date();

    return expiresAt > now;
  } catch (error) {
    console.error('[isDemoMode] Error:', error);
    return false;
  }
}

/**
 * Check if current request is from demo subdomain
 * Note: Initial MVP uses /demo route, not subdomain
 * This function is for future subdomain support
 *
 * @returns true if request is from demo.lekbanken.no
 */
export async function isDemoSubdomain(): Promise<boolean> {
  try {
    const headerStore = await headers();
    const host = headerStore.get('host') || '';
    return host.startsWith('demo.');
  } catch (error) {
    console.error('[isDemoSubdomain] Error:', error);
    return false;
  }
}

/**
 * Get current demo session details
 *
 * @returns Demo session info or null if not in demo mode
 */
export async function getDemoSession(): Promise<DemoSessionInfo | null> {
  try {
    const supabase = await createServerRlsClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Get active demo session
    const { data: demoSession } = await supabase
      .from('demo_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!demoSession) {
      return null;
    }

    // Check if expired
    const expiresAt = new Date(demoSession.expires_at);
    const now = new Date();
    const timeRemaining = expiresAt.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      // Session expired
      return null;
    }

    return {
      id: demoSession.id,
      userId: demoSession.user_id,
      tenantId: demoSession.tenant_id,
      tier: demoSession.demo_tier as DemoTier,
      startedAt: demoSession.started_at,
      expiresAt: demoSession.expires_at,
      endedAt: demoSession.ended_at,
      converted: demoSession.converted ?? false,
      timeRemaining,
    };
  } catch (error) {
    console.error('[getDemoSession] Error:', error);
    return null;
  }
}

/**
 * Get demo tier from current session
 *
 * @returns 'free', 'premium', or null if not in demo mode
 */
export async function getDemoTier(): Promise<DemoTier | null> {
  const session = await getDemoSession();
  return session?.tier || null;
}

/**
 * Check if a specific feature is available in current demo tier
 *
 * @param feature - Feature name to check
 * @returns true if feature is available
 */
export async function isDemoFeatureAvailable(feature: string): Promise<boolean> {
  const tier = await getDemoTier();

  if (!tier) {
    // Not in demo mode - all features available
    return true;
  }

  // Free tier restrictions (from Decision 1: Hybrid model)
  const FREE_TIER_DISABLED_FEATURES = [
    'export_data',
    'invite_users',
    'modify_tenant_settings',
    'access_billing',
    'create_public_sessions',
    'advanced_analytics',
    'custom_branding',
  ];

  if (tier === 'free') {
    return !FREE_TIER_DISABLED_FEATURES.includes(feature);
  }

  // Premium tier - all features available
  return true;
}

/**
 * Get demo session cookie (if exists)
 * Note: Used for client-side session tracking
 */
export async function getDemoSessionCookie(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('demo_session_id')?.value;
  } catch (error) {
    console.error('[getDemoSessionCookie] Error:', error);
    return undefined;
  }
}

/**
 * Server-side utility to check if user can perform action
 * Combines demo mode check with feature availability
 *
 * @param feature - Feature to check
 * @returns Object with canPerform and reason
 */
export async function canPerformDemoAction(feature: string): Promise<{
  canPerform: boolean;
  reason?: string;
}> {
  const isDemo = await isDemoMode();

  if (!isDemo) {
    // Not in demo mode - allow everything
    return { canPerform: true };
  }

  const isAvailable = await isDemoFeatureAvailable(feature);

  if (!isAvailable) {
    const tier = await getDemoTier();
    return {
      canPerform: false,
      reason: `This feature is not available in the ${tier} demo tier. Contact sales to unlock premium features.`,
    };
  }

  return { canPerform: true };
}

/**
 * Format time remaining for display
 *
 * @param milliseconds - Time remaining in milliseconds
 * @returns Formatted string like "1h 23m" or "15m"
 */
export function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 1000 / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Get demo context for Server Component
 * Single function that returns all demo-related info
 *
 * @returns Complete demo context
 */
export async function getDemoContext() {
  const isDemo = await isDemoMode();

  if (!isDemo) {
    return {
      isDemoMode: false,
      session: null,
      tier: null,
      timeRemaining: null,
      timeRemainingFormatted: null,
    };
  }

  const session = await getDemoSession();

  return {
    isDemoMode: true,
    session,
    tier: session?.tier || null,
    timeRemaining: session?.timeRemaining || null,
    timeRemainingFormatted: session?.timeRemaining
      ? formatTimeRemaining(session.timeRemaining)
      : null,
  };
}
