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
  useRef,
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
    async (currentUser: User): Promise<UserProfile | null> => {
      return await ensureProfile(currentUser)
    },
    [ensureProfile]
  )

  const fetchMemberships = useCallback(async (currentUser: User): Promise<TenantMembership[]> => {
    const { data, error } = await supabase
      .from('user_tenant_memberships')
      .select('*, tenant:tenants(*)')
      .eq('user_id', currentUser.id)

    if (error) {
      console.warn('[auth] fetchMemberships error:', error)
      return []
    }

    return (data as TenantMembership[]) ?? []
  }, [])

  // Dedupe in-flight auth data fetches to prevent race conditions between
  // initAuth() and onAuthStateChange events. Keyed on userId to handle user switches.
  const inflightRef = useRef<{ userId: string; promise: Promise<void> } | null>(null)

  // Track mounted state to prevent stale state writes during navigation/unmount
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const refreshAuthData = useCallback(async (authUser: User) => {
    // If already fetching for THIS user, return the existing promise
    // If userId changed (user switch), create new promise
    if (inflightRef.current?.userId === authUser.id) {
      return inflightRef.current.promise
    }

    const promise = (async () => {
      // Fetch data first (pure, no side effects)
      const [profile, memberships] = await Promise.all([
        fetchProfile(authUser),
        fetchMemberships(authUser),
      ])

      // Guard: only update state if still mounted (prevents stale writes)
      if (!isMountedRef.current) return

      setUser(authUser)
      setUserProfile(profile ?? null)
      setMemberships(memberships)
    })().finally(() => {
      // Only clear if this is still the active request for this user
      if (inflightRef.current?.userId === authUser.id) {
        inflightRef.current = null
      }
    })

    inflightRef.current = { userId: authUser.id, promise }
    return promise
  }, [fetchProfile, fetchMemberships])

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

        if (authUser && isMountedRef.current) {
          await refreshAuthData(authUser)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    void initAuth()
  }, [refreshAuthData, initialUser])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return

      // SIGNED_OUT: Clear state and redirect
      // Note: We clear sb-* cookies aggressively to prevent stale session state.
      // This is intentional after server-side dedupe fixes to ensure clean logout.
      if (event === 'SIGNED_OUT') {
        // Cancel any in-flight refresh to prevent stale writes
        inflightRef.current = null

        if (typeof document !== 'undefined') {
          document.cookie = 'lb_tenant=; Path=/; Max-Age=0; SameSite=Lax'
          document.cookie = 'demo_session_id=; Path=/; Max-Age=0; SameSite=Lax'
          document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim()
            if (name.includes('sb-') || name.includes('supabase')) {
              document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
            }
          })
        }
        // Guard: check mounted before state updates
        if (isMountedRef.current) {
          setUser(null)
          setUserProfile(null)
          setMemberships([])
        }
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.href = '/auth/login?signedOut=true'
          }, 100)
        }
        return
      }

      // No session = clear state
      if (!session) {
        if (isMountedRef.current) {
          setUser(null)
          setUserProfile(null)
          setMemberships([])
        }
        return
      }

      // IMPORTANT: Never read session.user directly - it triggers Supabase security warning
      // Always use getUser() which validates with auth server
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        if (isMountedRef.current) {
          setUser(null)
          setUserProfile(null)
          setMemberships([])
        }
        return
      }

      // Event matrix:
      // - SIGNED_IN: Full refresh (user + profile + memberships)
      //   NOTE: We intentionally skip router.refresh() here. The login page
      //   uses window.location.href (hard redirect) which triggers a full
      //   server render. An RSC refresh on a guest-only path (/auth/login)
      //   would race with the hard redirect — the proxy sees the now-authenticated
      //   user on a guest-only path and returns a redirect, which can interfere
      //   with the pending window.location navigation.
      // - USER_UPDATED: Full refresh (metadata may affect profile/role) + router.refresh()
      // - TOKEN_REFRESHED: Just update user (reduce traffic, token refresh is frequent)
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        await refreshAuthData(authUser)
        if (event === 'USER_UPDATED') {
          router.refresh()
        }
      } else {
        // TOKEN_REFRESHED and other events: just update user object
        if (isMountedRef.current) {
          setUser(authUser)
        }
      }
    })

    return () => subscription?.unsubscribe()
  }, [refreshAuthData, router])

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
      await refreshAuthData(data.user)
    }
  }, [refreshAuthData])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (data.user) {
      await refreshAuthData(data.user)
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
  }, [refreshAuthData])

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

    // Cancel any in-flight refresh
    inflightRef.current = null

    if (isMountedRef.current) {
      setUser(null)
      setUserProfile(null)
      setMemberships([])
    }

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
        const errorJson = (await response.json()) as { error?: string; details?: string }
        if (typeof errorJson?.error === 'string') {
          message = errorJson.details
            ? `${errorJson.error}: ${errorJson.details}`
            : errorJson.error
        }
      } catch (err) {
        console.warn('[auth] updateProfile error parsing response', err)
      }
      throw new Error(message)
    }

    const payload = (await response.json()) as { user?: UserProfile | null }
    if (payload?.user) {
      setUserProfile(payload.user)
    } else {
      // fetchProfile now returns data, so we need to set state here
      const profile = await fetchProfile(user)
      setUserProfile(profile ?? null)
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
