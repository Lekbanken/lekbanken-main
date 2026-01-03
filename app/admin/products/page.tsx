import { redirect } from 'next/navigation'
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'

export default async function ProductsRedirect() {
  await requireSystemAdmin('/admin')
  redirect('/admin/billing')
}
