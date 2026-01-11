'use client'

import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/auth'
import type { TenantMembership } from '@/types/tenant'
import { PreferencesProvider } from '@/lib/context/PreferencesContext'
import { AuthProvider } from '@/lib/supabase/auth'
import { CookieConsentBanner } from '@/components/legal/CookieConsentBanner'

type ProvidersProps = {
  children: ReactNode
  initialUser?: User | null
  initialProfile?: UserProfile | null
  initialMemberships?: TenantMembership[]
}

export function Providers({
  children,
  initialUser,
  initialProfile,
  initialMemberships,
}: ProvidersProps) {
  return (
    <AuthProvider
      initialUser={initialUser}
      initialProfile={initialProfile}
      initialMemberships={initialMemberships}
    >
      <PreferencesProvider>
        {children}
        <CookieConsentBanner />
      </PreferencesProvider>
    </AuthProvider>
  )
}
