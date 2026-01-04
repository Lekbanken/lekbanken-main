import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { OrganisationDetailPage } from "@/features/admin/organisations/OrganisationDetailPage";

type PageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function OrganisationPage({ params }: PageProps) {
  await requireSystemAdmin('/admin/organisations')
  const { tenantId } = await params;
  return <OrganisationDetailPage tenantId={tenantId} />;
}
