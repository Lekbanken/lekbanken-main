import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { ProductAdminPageV2 } from '@/features/admin/products/v2';

export default async function ProductsPage() {
  await requireSystemAdmin('/admin');
  return <ProductAdminPageV2 />;
}
