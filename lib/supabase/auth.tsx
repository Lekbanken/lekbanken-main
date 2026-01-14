/**
 * Auth Context Hook
 *
 * Provides authentication state and methods to React components.
 * Supports server-hydrated initial state to avoid client-side flicker.
 */

'use client'

import type {
  ReactNode} from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from './client'
import { deriveEffectiveGlobalRole } from '@/lib/auth/role'
import type { GlobalRole, UserProfile } from '@/types/auth'
import type { TenantMembership } from '@/types/tenant'

interface AuthProviderProps {
  children: ReactNode
  initialUser?: User | null
  initialProfile?: UserProfile | null
  initialMemberships?: TenantMembership[]
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  memberships: TenantMembership[]
  effectiveGlobalRole: GlobalRole | null
  userRole: GlobalRole | null // Deprecated alias
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: (redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  initialUser,
  initialProfile,
  initialMemberships,
}: AuthProviderProps) {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(initialUser ?? null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile ?? null)
  const [memberships, setMemberships] = useState<TenantMembership[]>(initialMemberships ?? [])
  const [isLoading, setIsLoading] = useState(initialUser === undefined)

  const effectiveGlobalRole = useMemo(
    () => deriveEffectiveGlobalRole(userProfile, user),
    [userProfile, user]
  )

  const ensureProfile = useCallback(async (currentUser: User, retryCount = 0): Promise<UserProfile | null> => {
    try {
      const isDemoUser = currentUser.user_metadata?.is_demo_user === true
      
      if (isDemoUser && retryCount === 0) {
        console.log('[ensureProfile] Demo user detected, will check profile quality', {
          userId: currentUser.id,
          metadata: currentUser.user_metadata
        })
      }

      // ONLY query by ID - never by email (email can have orphaned profiles)
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.warn('ensureProfile select error:', error)
        return null
      }

      if (isDemoUser) {
        console.log('[ensureProfile] Demo user profile fetched:', {
          exists: !!profile,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
          is_demo_user: profile?.is_demo_user
        })
      }

      // For demo users, retry a few times if profile is incomplete
      // This handles race condition between trigger and upsert
      const profileIncomplete = profile && (
        !profile.full_name || 
        profile.full_name === currentUser.email?.split('@')[0] ||
        !profile.avatar_url ||
        !profile.is_demo_user
      )
      
      if (isDemoUser && (!profile || profileIncomplete) && retryCount < 3) {
        // Wait with exponential backoff: 100ms, 200ms, 400ms
        const delay = 100 * Math.pow(2, retryCount)
        console.log(`[ensureProfile] Demo user profile ${profileIncomplete ? 'incomplete' : 'not found'}, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return ensureProfile(currentUser, retryCount + 1)
      }

      if (profile) return profile as UserProfile

      // No profile found by ID - this means the user needs a profile created
      // DO NOT fallback to email lookup as it can return orphaned/wrong profiles
      console.warn('ensureProfile: no profile found for auth user', currentUser.id, currentUser.email)
      
      // Return a minimal synthetic profile from auth user metadata
      // The real profile should be created server-side via trigger or API
      const syntheticProfile: Partial<UserProfile> = {
        id: currentUser.id,
        email: currentUser.email ?? undefined,
        full_name: (currentUser.user_metadata?.full_name as string) ?? 
                   (currentUser.user_metadata?.name as string) ?? 
                   currentUser.email?.split('@')[0] ?? undefined,
        avatar_url: (currentUser.user_metadata?.avatar_url as string) ?? 
                    (currentUser.user_metadata?.picture as string) ?? undefined,
        created_at: currentUser.created_at,
        updated_at: new Date().toISOString(),
      }
      
      return syntheticProfile as UserProfile
    } catch (err) {
      console.error('ensureProfile error:', err)
      return null
    }
  }, [])

  const fetchProfile = useCallback(
    async (currentUser: User) => {
      const profile = await ensureProfile(currentUser)
      setUserProfile(profile ?? null)
    },
    [ensureProfile]
  )

  const fetchMemberships = useCallback(async (currentUser: User) => {
    const { data, error } = await supabase
      .from('user_tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', currentUser.id)

    if (error) {
      console.warn('[auth] fetchMemberships error:', error)
      return
    }

    setMemberships((data as TenantMembership[]) ?? [])
  }, [])

  useEffect(() => {
    // Skip client init if server provided initial data (including null)
    if (initialUser !== undefined) {
      setIsLoading(false)
      return
    }

    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          setUser(authUser)
          await Promise.all([fetchProfile(authUser), fetchMemberships(authUser)])
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void initAuth()
  }, [fetchMemberships, fetchProfile, initialUser])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return

      if (event === 'SIGNED_OUT') {
        // Clear all client-side cookies
        if (typeof document !== 'undefined') {
          document.cookie = 'lb_tenant=; Path=/; Max-Age=0; SameSite=Lax'
          document.cookie = 'demo_session_id=; Path=/; Max-Age=0; SameSite=Lax'
          // Clear all supabase cookies
          document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim()
            if (name.includes('sb-') || name.includes('supabase')) {
              document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
            }
          })
        }
        setUser(null)
        setUserProfile(null)
        setMemberships([])
        // Force full page reload to clear any cached state
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/auth/login?signedOut=true'
          }, 100)
        }
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await Promise.all([fetchProfile(session.user), fetchMemberships(session.user)])
        router.refresh()
        return
      }

      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setUserProfile(null)
        setMemberships([])
      }
    })

    return () => subscription?.unsubscribe()
  }, [fetchMemberships, fetchProfile, router])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
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
    if (data.user) {
      setUser(data.user)
      await Promise.all([fetchProfile(data.user), fetchMemberships(data.user)])
    }
  }, [fetchMemberships, fetchProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (data.user) {
      setUser(data.user)
      await Promise.all([fetchProfile(data.user), fetchMemberships(data.user)])
      void fetch('/api/accounts/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_fingerprint: null,
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          device_type: null,
        }),
      }).catch(() => {})
      void fetch('/api/accounts/sessions', { method: 'GET' }).catch(() => {})
    }
  }, [fetchMemberships, fetchProfile])

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    const urlParams = new URLSearchParams(window.location.search)
    const nextUrl = redirectTo || urlParams.get('redirect') || urlParams.get('next') || '/app'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    })

    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    try {
      const response = await fetch('/auth/signout', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })

      if (!response.ok) {
        await supabase.auth.signOut()
      }
    } catch {
      await supabase.auth.signOut()
    }

    setUser(null)
    setUserProfile(null)
    setMemberships([])

    if (typeof document !== 'undefined') {
      document.cookie = 'lb_tenant=; Path=/; Max-Age=0; SameSite=Lax'
    }

    window.location.href = '/auth/login?signedOut=true'
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  }, [])

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in')

    const response = await fetch('/api/accounts/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      let message = 'Failed to update profile'
      try {
        const errorJson = (await response.json()) as { error?: string }
        if (typeof errorJson?.error === 'string') message = errorJson.error
      } catch (err) {
        console.warn('[auth] updateProfile error parsing response', err)
      }
      throw new Error(message)
    }

    const payload = (await response.json()) as { user?: UserProfile | null }
    if (payload?.user) {
      setUserProfile(payload.user)
    } else {
      await fetchProfile(user)
    }

    const { data: refreshedAuth } = await supabase.auth.getUser()
    if (refreshedAuth?.user) {
      setUser(refreshedAuth.user)
    }
  }, [fetchProfile, user])

  const value: AuthContextType = {
    user,
    userProfile,
    memberships,
    effectiveGlobalRole,
    userRole: effectiveGlobalRole,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
