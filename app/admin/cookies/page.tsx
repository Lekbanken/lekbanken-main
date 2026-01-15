/**
 * Cookie Management Admin Page
 * 
 * Provides administrators with tools to manage:
 * - Cookie catalog (CRUD for cookie_catalog table)
 * - Consent policy versions
 * - Consent statistics dashboard
 * - Consent audit log viewer
 */

import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { getTranslations } from 'next-intl/server'
import { AdminPageHeader, AdminPageLayout } from '@/components/admin/shared'
import { CookieAdminTabs } from './components/CookieAdminTabs'

// Icon for cookies - using a custom SVG
function CookieIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="13" r="1" fill="currentColor" />
      <circle cx="13" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

export default async function CookiesAdminPage() {
  // Require system admin access
  await requireSystemAdmin('/admin')
  
  const t = await getTranslations('admin.cookies')
  
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('pageTitle')}
        description={t('pageDescription')}
        icon={<CookieIcon className="h-8 w-8 text-primary" />}
      />
      
      <CookieAdminTabs />
    </AdminPageLayout>
  )
}
