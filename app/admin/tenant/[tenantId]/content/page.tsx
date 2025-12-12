import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantContentPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Material"
        description="Hantera organisationens material och bibliotek."
        icon={<DocumentTextIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<DocumentTextIcon className="h-6 w-6" />}
        title="Inget material ännu"
        description="Sidan kommer snart att visa bibliotek, uppladdningar och status per modul."
      />
    </AdminPageLayout>
  );
}
