'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/auth'
import type { TenantMembership } from '@/types/tenant'
import { PreferencesProvider } from '@/lib/context/PreferencesContext'
import { AuthProvider } from '@/lib/supabase/auth'

// Dynamically import CookieConsentBanner to avoid SSR issues
// This ensures it only renders on the client where NextIntlClientProvider context is available
const CookieConsentBanner = dynamic(
  () => import('@/components/cookie/CookieConsentBanner').then(mod => mod.CookieConsentBanner),
  { ssr: false }
)

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
