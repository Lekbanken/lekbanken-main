import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { CosmeticsAdminClient } from './CosmeticsAdminClient';

export const metadata = {
  title: 'Cosmetics | Admin',
  description: 'Manage cosmetic catalog, unlock rules and grants.',
};

export default async function CosmeticsAdminPage() {
  await requireSystemAdmin();
  return <CosmeticsAdminClient />;
}
