import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { ProductHubPage } from '@/features/admin/products/ProductHubPage';

export default async function ProductsPage() {
  await requireSystemAdmin('/admin');
  return <ProductHubPage />;
}
