'use client'

import { useState } from 'react'
import { useTenant } from '@/lib/context/TenantContext'
import { TenantMediaBank } from '@/features/admin/media/TenantMediaBank'
import { StandardImagesManager } from '@/features/admin/media/StandardImagesManager'
import { Tabs } from '@/components/ui/tabs'

export default function MediaAdminPage() {
  const { currentTenant } = useTenant()
  const [activeTab, setActiveTab] = useState('tenant-media')
  
  if (!currentTenant) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Loading tenant information...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'tenant-media', label: 'Tenant Media Library' },
    { id: 'standard-images', label: 'Standard Images' },
  ]

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Media Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage tenant media library and standard image templates
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'tenant-media' && <TenantMediaBank tenantId={currentTenant.id} />}
        {activeTab === 'standard-images' && <StandardImagesManager tenantId={currentTenant.id} />}
      </div>
    </div>
  )
}
