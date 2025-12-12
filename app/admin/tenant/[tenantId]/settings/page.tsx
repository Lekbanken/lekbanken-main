import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantSettingsPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Inställningar"
        description="Hantera organisationens inställningar, branding och gamification."
        icon={<Cog6ToothIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<Cog6ToothIcon className="h-6 w-6" />}
        title="Inställningar kommer snart"
        description="Här lägger vi till branding, gamification-konfiguration och säkerhetsinställningar."
      />
    </AdminPageLayout>
  );
}
