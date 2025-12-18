import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { OrganisationAdminPage } from "@/features/admin/organisations/OrganisationAdminPage";

export default async function OrganisationsPage() {
  await requireSystemAdmin('/admin')
  return <OrganisationAdminPage />;
}
