'use client'

import { useState } from 'react'
import { useTenant } from '@/lib/context/TenantContext'
import { TenantMediaBank } from '@/features/admin/media/TenantMediaBank'
import { StandardImagesManager } from '@/features/admin/media/StandardImagesManager'
import { Tabs } from '@/components/ui/tabs'
import { AdminPageLayout, AdminPageHeader, AdminEmptyState } from '@/components/admin/shared'
import { PhotoIcon } from '@heroicons/react/24/outline'

export default function MediaAdminPage() {
  const { currentTenant } = useTenant()
  const [activeTab, setActiveTab] = useState('tenant-media')
  
  if (!currentTenant) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<PhotoIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj en organisation för att hantera media."
        />
      </AdminPageLayout>
    )
  }

  const tabs = [
    { id: 'tenant-media', label: 'Tenant Media Library' },
    { id: 'standard-images', label: 'Standard Images' },
  ]

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Media Management"
        description="Hantera organisationens media och standardbilder."
        icon={<PhotoIcon className="h-8 w-8 text-primary" />}
      />

      <div className="space-y-4">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-2">
          {activeTab === 'tenant-media' && <TenantMediaBank tenantId={currentTenant.id} />}
          {activeTab === 'standard-images' && <StandardImagesManager tenantId={currentTenant.id} />}
        </div>
      </div>
    </AdminPageLayout>
  )
}
