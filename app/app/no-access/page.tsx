'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function NoAccessPage() {
  const t = useTranslations('app.noAccess')
  
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/app/profile"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50 hover:text-primary"
        >
          {t('selectOrg')}
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('backToApp')}
        </Link>
      </div>
    </div>
  )
}
