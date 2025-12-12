import { PlayIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function SessionsAdminPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Sessioner"
        description="Visa och hantera deltagarsessioner, statistik och ev. avvikelser."
        icon={<PlayIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<PlayIcon className="h-6 w-6" />}
        title="Inga sessioner att visa ännu"
        description="Denna sida kommer visa aktiva/historiska sessioner, deltagare och status. Data kopplas på senare."
      />
    </AdminPageLayout>
  );
}
