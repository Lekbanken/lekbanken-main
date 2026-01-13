/**
 * Ephemeral User Management
 * Purpose: Create temporary demo users on-demand
 * Security: Users auto-deleted after 24h by cleanup function
 */

import { createServerRlsClient, supabaseAdmin } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

/**
 * Demo tenant ID (from seed: 01_demo_tenant.sql)
 * Note: 00000000-0000-0000-0000-000000000001 is reserved for Lekbanken main tenant
 * Demo uses: de01 suffix (demo 01)
 */
export const DEMO_TENANT_ID = '00000000-0000-0000-0000-00000000de01';

/**
 * Demo tier types (from Decision 1: Hybrid model)
 */
export type DemoTier = 'free' | 'premium';

/**
 * Generate cryptographically secure password for ephemeral user
 */
export function generateSecurePassword(): string {
  // 32 bytes = 256 bits of entropy
  // Converted to base64 for password compatibility
  return randomBytes(32).toString('base64');
}

/**
 * Generate unique email for ephemeral demo user
 */
export function generateDemoEmail(): string {
  // Use timestamp + random for uniqueness
  const timestamp = Date.now();
  const random = randomBytes(8).toString('hex');
  return `demo-${timestamp}-${random}@temp.lekbanken.internal`;
}

/**
 * Create ephemeral demo user
 *
 * @param tier - Demo tier ('free' or 'premium')
 * @returns Object with user, password, and error
 */
export async function createEphemeralDemoUser(tier: DemoTier = 'free') {
  const supabase = await createServerRlsClient();

  try {
    // Generate credentials
    const email = generateDemoEmail();
    const password = generateSecurePassword();

    // Create auth user via admin API (requires service role)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm
      user_metadata: {
        is_ephemeral: true,
        is_demo_user: true,
        demo_tier: tier,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      },
    });

    if (authError || !authData.user) {
      console.error('[createEphemeralDemoUser] Auth user creation failed:', authError);
      return {
        user: null,
        password: null,
        error: authError || new Error('User creation failed'),
      };
    }

    // Update user profile with demo flags
    // Note: User might be auto-created by trigger, we ensure it has correct flags
    const { error: profileError } = await supabase
      .from('users')
      .upsert(
        {
          id: authData.user.id,
          email,
          is_demo_user: true,
          is_ephemeral: true,
          global_role: 'demo_private_user',
          demo_session_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (profileError) {
      console.error('[createEphemeralDemoUser] Profile upsert failed:', profileError);
      // Continue anyway - profile might already exist with correct flags
    }

    // Create membership in demo tenant
    const { error: membershipError } = await supabase.from('user_tenant_memberships').insert({
      user_id: authData.user.id,
      tenant_id: DEMO_TENANT_ID,
      role: tier === 'premium' ? 'admin' : 'member',
      created_at: new Date().toISOString(),
    });

    if (membershipError) {
      console.error('[createEphemeralDemoUser] Membership creation failed:', membershipError);
      // This is non-critical if membership already exists
    }

    console.log(`[createEphemeralDemoUser] Created ephemeral user: ${authData.user.id} (${tier})`);

    return {
      user: authData.user,
      password,
      error: null,
    };
  } catch (error) {
    console.error('[createEphemeralDemoUser] Unexpected error:', error);
    return {
      user: null,
      password: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Sign in as ephemeral demo user
 *
 * @param email - Demo user email
 * @param password - Demo user password
 * @returns Session data or error
 */
export async function signInAsEphemeralUser(email: string, password: string) {
  const supabase = await createServerRlsClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      console.error('[signInAsEphemeralUser] Sign in failed:', error);
      return {
        session: null,
        error: error || new Error('Sign in failed'),
      };
    }

    console.log(`[signInAsEphemeralUser] Signed in: ${data.user.id}`);

    return {
      session: data.session,
      error: null,
    };
  } catch (error) {
    console.error('[signInAsEphemeralUser] Unexpected error:', error);
    return {
      session: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Create demo session tracking record
 *
 * @param userId - User ID
 * @param tier - Demo tier
 * @returns Demo session or error
 */
export async function createDemoSession(userId: string, tier: DemoTier = 'free') {
  const supabase = await createServerRlsClient();

  try {
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const { data, error } = await supabase
      .from('demo_sessions')
      .insert({
        user_id: userId,
        tenant_id: DEMO_TENANT_ID,
        demo_tier: tier,
        expires_at: expiresAt.toISOString(),
        started_at: new Date().toISOString(),
      })
      .select('id, expires_at')
      .single();

    if (error || !data) {
      console.error('[createDemoSession] Session creation failed:', error);
      return {
        session: null,
        error: error || new Error('Session creation failed'),
      };
    }

    console.log(`[createDemoSession] Created demo session: ${data.id} for user ${userId}`);

    return {
      session: data,
      error: null,
    };
  } catch (error) {
    console.error('[createDemoSession] Unexpected error:', error);
    return {
      session: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Complete demo flow: Create user → Sign in → Create session
 *
 * @param tier - Demo tier ('free' or 'premium')
 * @returns Complete demo setup or error
 */
export async function setupDemoUser(tier: DemoTier = 'free') {
  // Step 1: Create ephemeral user
  const { user, password, error: userError } = await createEphemeralDemoUser(tier);

  if (userError || !user || !password) {
    return {
      user: null,
      session: null,
      demoSession: null,
      error: userError || new Error('Failed to create user'),
    };
  }

  // Step 2: Sign in as user
  const { session, error: signInError } = await signInAsEphemeralUser(user.email!, password);

  if (signInError || !session) {
    return {
      user,
      session: null,
      demoSession: null,
      error: signInError || new Error('Failed to sign in'),
    };
  }

  // Step 3: Create demo session tracking
  const { session: demoSession, error: sessionError } = await createDemoSession(user.id, tier);

  if (sessionError) {
    // Non-critical - user is still signed in
    console.warn('[setupDemoUser] Demo session tracking failed, but user is signed in:', sessionError);
  }

  return {
    user,
    session,
    demoSession,
    error: null,
  };
}

/**
 * Get demo tier from user metadata or session
 * Fallback to 'free' if not found
 */
export async function getDemoTier(): Promise<DemoTier> {
  const supabase = await createServerRlsClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return 'free';
    }

    // Check user metadata first
    const tierFromMetadata = user.user_metadata?.demo_tier as DemoTier | undefined;
    if (tierFromMetadata === 'free' || tierFromMetadata === 'premium') {
      return tierFromMetadata;
    }

    // Fallback: Check demo_sessions table
    const { data: demoSession } = await supabase
      .from('demo_sessions')
      .select('demo_tier')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return (demoSession?.demo_tier as DemoTier) || 'free';
  } catch (error) {
    console.error('[getDemoTier] Error:', error);
    return 'free';
  }
}
