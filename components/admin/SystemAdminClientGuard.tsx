'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/supabase/auth'

export function SystemAdminClientGuard({ children }: { children: ReactNode }) {
  const t = useTranslations('admin.guard')
  const router = useRouter()
  const { effectiveGlobalRole, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (effectiveGlobalRole !== 'system_admin') {
      router.replace('/admin')
    }
  }, [effectiveGlobalRole, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('verifyingPermission')}</p>
      </div>
    )
  }

  if (effectiveGlobalRole !== 'system_admin') {
    return null
  }

  return children
}
