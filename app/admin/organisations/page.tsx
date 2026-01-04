import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import { getAdminOrganisationList } from "@/features/admin/organisations/organisationList.server";
import { OrganisationAdminPage } from "@/features/admin/organisations/OrganisationAdminPage";

export default async function OrganisationsPage() {
  await requireSystemAdmin("/admin/organisations");
  const { organisations, error } = await getAdminOrganisationList();

  return (
    <OrganisationAdminPage
      initialOrganisations={organisations}
      initialError={error}
    />
  );
}
