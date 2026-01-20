import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import MediaLegacyPage from './_legacy-page'

export default async function MediaPage() {
  await requireSystemAdmin('/admin')
  return <MediaLegacyPage />
}
