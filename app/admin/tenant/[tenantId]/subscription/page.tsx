import { CreditCardIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantSubscriptionPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Prenumeration"
        description="Prenumerationsplan och användning för organisationen."
        icon={<CreditCardIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<CreditCardIcon className="h-6 w-6" />}
        title="Ingen prenumerationsdata ännu"
        description="Sidan kommer visa plan, kvoter och status när billing är kopplad."
      />
    </AdminPageLayout>
  );
}
