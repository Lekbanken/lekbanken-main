import { CreditCardIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantBillingPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Fakturering"
        description="Översikt över prenumeration och fakturor."
        icon={<CreditCardIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<CreditCardIcon className="h-6 w-6" />}
        title="Ingen faktureringsdata ännu"
        description="Sidan kommer snart visa plan, fakturor och betalningsmetoder för organisationen."
      />
    </AdminPageLayout>
  );
}
