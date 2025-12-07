/**
 * Auth Context Hook
 *
 * Provides authentication state and methods to React components.
 * Handles user session, login, logout, signup and MFA.
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from './client'
import type { Database } from '@/types/supabase'

type UserProfile = Database['public']['Tables']['users']['Row']

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  userRole: string | null
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const ensureProfile = useCallback(async (currentUser: User) => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      // DEBUG
      console.log('[auth] ensureProfile result:', { userId: currentUser.id, profile, error: error?.message })

      if (error) {
        console.warn('ensureProfile select error:', error)
        return null
      }

      if (profile) return profile as UserProfile

      // Profil saknas och vi försöker inte skapa från klienten p.g.a. RLS.
      console.warn('ensureProfile: profile missing and upsert skipped (RLS/client)', currentUser.id)
      return null
    } catch (err) {
      console.error('ensureProfile error:', err)
      return null
    }
  }, [])

  const fetchProfile = useCallback(async (currentUser: User) => {
    const profile = await ensureProfile(currentUser)
    setUserProfile(profile ?? null)
  }, [ensureProfile])

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      console.log('[auth] initAuth starting...')
      try {
        // Use getUser() instead of getSession() for security
        const {
          data: { user: authUser },
          error: userError,
        } = await supabase.auth.getUser()

        console.log('[auth] getUser result:', { hasUser: !!authUser, userId: authUser?.id, error: userError?.message })

        if (authUser) {
          setUser(authUser)
          await fetchProfile(authUser)
          console.info('[auth] session init complete', {
            userId: authUser.id,
            roleMeta: authUser.app_metadata?.role,
          })
        } else {
          console.log('[auth] No user found')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        console.log('[auth] initAuth done, setting isLoading=false')
        setIsLoading(false)
      }
    }

    void initAuth()

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[auth] onAuthStateChange:', event)
      
      if (event === 'SIGNED_OUT') {
        // Clear tenant cookie on client side as backup
        if (typeof document !== 'undefined') {
          document.cookie = 'lb_tenant=; Path=/; Max-Age=0; SameSite=Lax'
        }
        setUser(null)
        setUserProfile(null)
        return
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
        // Refresh to ensure server components see the new session
        router.refresh()
        console.info('[auth] SIGNED_IN', {
          userId: session.user.id,
          roleMeta: session.user.app_metadata?.role,
        })
        return
      }
      
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
        console.info('[auth] auth change', {
          userId: session.user.id,
          expiresAt: session.expires_at,
          roleMeta: session.user.app_metadata?.role,
        })
      } else {
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => subscription?.unsubscribe()
  }, [fetchProfile])

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
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (data.user) {
      setUser(data.user)
      await fetchProfile(data.user)
    }
  }, [fetchProfile])

  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    // Get redirect from URL params if not provided
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
      // Call server-side signout to properly clear httpOnly cookies
      const response = await fetch('/auth/signout', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      })
      
      if (!response.ok) {
        console.warn('[auth] Server signout failed, falling back to client signout')
        await supabase.auth.signOut()
      }
    } catch (err) {
      console.warn('[auth] Server signout error, falling back to client signout:', err)
      await supabase.auth.signOut()
    }
    
    // Clear client state
    setUser(null)
    setUserProfile(null)
    
    // Clear tenant cookie on client side as backup
    if (typeof document !== 'undefined') {
      document.cookie = 'lb_tenant=; Path=/; Max-Age=0; SameSite=Lax'
    }
    
    // Hard redirect to login - forces full page reload to clear all React state
    // router.push() does soft navigation which can keep cached state
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

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    if (data) {
      setUserProfile(data)
    }
  }, [user])

  const fallbackRole = userProfile?.role || (user?.app_metadata?.role as string | undefined) || null

  if (!userProfile && !fallbackRole && user) {
    console.warn('[auth] userRole unresolved (no profile/app_metadata.role)', { userId: user.id })
  }

  const value: AuthContextType = {
    user,
    userProfile,
    userRole: fallbackRole,
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
