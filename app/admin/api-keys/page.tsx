import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { KeyIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default async function ApiKeysPage() {
  await requireSystemAdmin('/admin')
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="API-nycklar"
        description="Hantera API-nycklar och scopes."
        icon={<KeyIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<KeyIcon className="h-6 w-6" />}
        title="Inga API-nycklar ännu"
        description="Här kommer du att skapa, rotera och begränsa nycklar. Backendkoppling saknas ännu."
      />
    </AdminPageLayout>
  );
}
