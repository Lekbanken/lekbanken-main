import { RssIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function WebhooksPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Webhooks"
        description="Hantera webhook-endpoints och loggar."
        icon={<RssIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<RssIcon className="h-6 w-6" />}
        title="Inga webhooks konfigurerade ännu"
        description="Här kommer du kunna lägga till endpoints, se leveransstatus och loggar. Backendkoppling saknas ännu."
      />
    </AdminPageLayout>
  );
}
