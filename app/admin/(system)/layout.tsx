import type { ReactNode } from 'react'
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'

export default async function SystemAdminLayout({ children }: { children: ReactNode }) {
  await requireSystemAdmin('/admin')
  return children
}


