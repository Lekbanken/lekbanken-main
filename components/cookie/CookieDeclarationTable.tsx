/**
 * Cookie Declaration Table
 * Displays all cookies used on the site, auto-generated from the database
 */

'use client'

import { useTranslations, useLocale } from 'next-intl'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import type { CookieCatalogEntry, CookieCategory } from '@/lib/consent/types'

interface CookieDeclarationTableProps {
  cookies: CookieCatalogEntry[]
}

const CATEGORY_COLORS: Record<CookieCategory, BadgeVariant> = {
  necessary: 'success',
  functional: 'primary',
  analytics: 'accent',
  marketing: 'warning',
}

export function CookieDeclarationTable({ cookies }: CookieDeclarationTableProps) {
  const t = useTranslations('cookie_consent')
  const locale = useLocale()

  // Group cookies by category
  const groupedCookies = cookies.reduce((acc, cookie) => {
    if (!acc[cookie.category]) {
      acc[cookie.category] = []
    }
    acc[cookie.category].push(cookie)
    return acc
  }, {} as Record<CookieCategory, CookieCatalogEntry[]>)

  const categoryOrder: CookieCategory[] = ['necessary', 'functional', 'analytics', 'marketing']

  const formatDuration = (ttlDays: number | null): string => {
    if (ttlDays === null) return t('declaration.duration.session')
    if (ttlDays === 0) return t('declaration.duration.session')
    if (ttlDays === 365) return t('declaration.duration.year')
    if (ttlDays > 365) return t('declaration.duration.years', { years: Math.round(ttlDays / 365) })
    return t('declaration.duration.days', { days: ttlDays })
  }

  const getPurpose = (cookie: CookieCatalogEntry): string => {
    if (cookie.purposeTranslations && cookie.purposeTranslations[locale]) {
      return cookie.purposeTranslations[locale]
    }
    if (cookie.purposeTranslations && cookie.purposeTranslations['en']) {
      return cookie.purposeTranslations['en']
    }
    return cookie.purpose
  }

  return (
    <div className="space-y-8">
      {categoryOrder.map((category) => {
        const categoryCookies = groupedCookies[category]
        if (!categoryCookies || categoryCookies.length === 0) return null

        return (
          <div key={category}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-white">
              <Badge variant={CATEGORY_COLORS[category]}>
                {t(`categories.${category}.title`)}
              </Badge>
            </h3>
            
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('declaration.table.name')}</TableHead>
                  <TableHead>{t('declaration.table.purpose')}</TableHead>
                  <TableHead>{t('declaration.table.provider')}</TableHead>
                  <TableHead>{t('declaration.table.duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryCookies.map((cookie) => (
                  <TableRow key={cookie.key}>
                    <TableCell>
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
                        {cookie.key}
                      </code>
                    </TableCell>
                    <TableCell className="max-w-md">
                      {getPurpose(cookie)}
                    </TableCell>
                    <TableCell>
                      {cookie.provider || 'Lekbanken'}
                    </TableCell>
                    <TableCell>
                      {formatDuration(cookie.ttlDays)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      })}
    </div>
  )
}
