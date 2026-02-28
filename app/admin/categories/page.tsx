import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { CategoriesAdminPage } from '@/features/admin/categories';

export default async function CategoriesPage() {
  await requireSystemAdmin('/admin');
  return <CategoriesAdminPage />;
}
