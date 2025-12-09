import { Suspense } from 'react'
import TenantAdminPage from './TenantAdminPage'

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Laddar...</div>}>
      <TenantAdminPage />
    </Suspense>
  )
}
