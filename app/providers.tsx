'use client'

import type { ReactNode } from 'react'
import { PreferencesProvider } from '@/lib/context/PreferencesContext'
import { AuthProvider } from '@/lib/supabase/auth'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PreferencesProvider>{children}</PreferencesProvider>
    </AuthProvider>
  )
}
