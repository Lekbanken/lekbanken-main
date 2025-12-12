import { ChartBarIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantAnalyticsPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Statistik"
        description="Visa nyckeltal för organisationens användning."
        icon={<ChartBarIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<ChartBarIcon className="h-6 w-6" />}
        title="Ingen statistik att visa ännu"
        description="Denna sida kommer visa användning, sessioner och progression när data kopplas på."
      />
    </AdminPageLayout>
  );
}
