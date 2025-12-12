import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function IncidentsPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Incidenter & Status"
        description="Visa driftincidenter, planerade avbrott och status."
        icon={<ExclamationTriangleIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<ExclamationTriangleIcon className="h-6 w-6" />}
        title="Ingen incidentdata ännu"
        description="Här kommer driftstatus och incidentlogg att visas när backendkoppling finns."
      />
    </AdminPageLayout>
  );
}
