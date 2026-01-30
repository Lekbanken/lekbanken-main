import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { LicenseAdminPage, fetchLicenses } from '@/features/admin/licenses';

export const metadata = {
  title: 'Licenser | Admin',
  description: 'Hantera licenser och prenumerationer',
};

/**
 * Admin page for managing licenses (both personal and organization)
 */
export default async function LicensesPage() {
  await requireSystemAdmin('/admin');

  const initialData = await fetchLicenses({}, 1, 25);

  return <LicenseAdminPage initialData={initialData} />;
}
