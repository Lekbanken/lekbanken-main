import { FlagIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function FeatureFlagsPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Feature Flags"
        description="Hantera systemflaggor och rollout."
        icon={<FlagIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<FlagIcon className="h-6 w-6" />}
        title="Inga flaggor att visa ännu"
        description="Flagg-hanteringen kopplas på när backend-stöd finns. Här ska du kunna toggla, segmentera och versionshantera."
      />
    </AdminPageLayout>
  );
}
