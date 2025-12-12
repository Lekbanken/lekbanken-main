import { UsersIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantMembersPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Medlemmar"
        description="Hantera organisationens medlemmar och roller."
        icon={<UsersIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<UsersIcon className="h-6 w-6" />}
        title="Inga medlemmar att visa ännu"
        description="Denna sida är under uppbyggnad. Snart kan du bjuda in, hantera roller och se aktivitet."
      />
    </AdminPageLayout>
  );
}
