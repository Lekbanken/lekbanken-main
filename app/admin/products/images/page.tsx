import { redirect } from 'next/navigation'
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'

export default async function ProductDefaultImagesPage() {
  await requireSystemAdmin('/admin')
  redirect('/admin/media')
}
