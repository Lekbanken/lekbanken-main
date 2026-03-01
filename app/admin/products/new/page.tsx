/**
 * /admin/products/new — Create a new product.
 *
 * Dedicated route that intercepts the [productId] dynamic route,
 * preventing "new" from being treated as a UUID.
 */

import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { ProductCreatePage } from '@/features/admin/products/v2/ProductCreatePage';

export default async function NewProductPage() {
  await requireSystemAdmin('/admin');
  return <ProductCreatePage />;
}
