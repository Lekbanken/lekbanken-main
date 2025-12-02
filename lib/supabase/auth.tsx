/**
 * Auth Context Hook
 *
 * Provides authentication state and methods to React components.
 * Handles user session, login, logout, signup and MFA.
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
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
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    void initAuth()

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user)
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

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setUserProfile(null)
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

  const value: AuthContextType = {
    user,
    userProfile,
    userRole: userProfile?.role || (user?.app_metadata?.role as string | undefined) || null,
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
