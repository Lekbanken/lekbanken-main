import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { MegaphoneIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default async function ReleaseNotesPage() {
  await requireSystemAdmin('/admin')
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Release Notes"
        description="Se och publicera versionsnyheter."
        icon={<MegaphoneIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<MegaphoneIcon className="h-6 w-6" />}
        title="Inga release notes ännu"
        description="Här kommer versionshistorik och redigering/publicering när backendkoppling finns."
      />
    </AdminPageLayout>
  );
}
