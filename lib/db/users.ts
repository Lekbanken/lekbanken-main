/**
 * Users Queries
 *
 * Database queries for user management and profiles.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type User = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']

/**
 * Get current user from auth
 */
export async function getCurrentUser(supabase: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

/**
 * Get user profile
 */
export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows
    throw error
  }

  return data
}

/**
 * Get current user profile (requires auth)
 */
export async function getCurrentUserProfile(
  supabase: SupabaseClient<Database>
): Promise<User | null> {
  const user = await getCurrentUser(supabase)
  if (!user) return null

  return getUserProfile(supabase, user.id)
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  updates: UserUpdate
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update current user profile
 */
export async function updateCurrentUserProfile(
  supabase: SupabaseClient<Database>,
  updates: UserUpdate
): Promise<User | null> {
  const user = await getCurrentUser(supabase)
  if (!user) return null

  return updateUserProfile(supabase, user.id, updates)
}

/**
 * Change user language preference
 */
export async function setUserLanguage(
  supabase: SupabaseClient<Database>,
  userId: string,
  language: 'NO' | 'SE' | 'EN'
): Promise<User> {
  return updateUserProfile(supabase, userId, { language })
}

/**
 * Get user by email (admin only)
 */
export async function getUserByEmail(
  supabase: SupabaseClient<Database>,
  email: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Sign up a new user
 */
export async function signUp(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string,
  fullName?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
      },
    },
  })

  if (error) throw error
  return data
}

/**
 * Sign in with email and password
 */
export async function signIn(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // Fire-and-forget to register device/session via accounts API
  void fetch('/api/accounts/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_fingerprint: null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      device_type: null,
    }),
  }).catch(() => {})
  void fetch('/api/accounts/sessions').catch(() => {})

  return data
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}

/**
 * Sign out current user
 */
export async function signOut(supabase: SupabaseClient<Database>) {
  const { error } = await supabase.auth.signOut()

  if (error) throw error
}

/**
 * Reset password with email
 */
export async function resetPassword(
  supabase: SupabaseClient<Database>,
  email: string
) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
  return data
}

/**
 * Update password
 */
export async function updatePassword(
  supabase: SupabaseClient<Database>,
  newPassword: string
) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
  return data
}

/**
 * Get auth session
 */
export async function getSession(supabase: SupabaseClient<Database>) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  supabase: SupabaseClient<Database>,
  callback: (event: string, session: unknown) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return subscription
}
