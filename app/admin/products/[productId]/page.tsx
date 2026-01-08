/**
 * /admin/products/[productId]/page.tsx
 *
 * Deep-link route for individual product view.
 * Renders the same ProductCardDrawer content in a full-page layout
 * to support bookmarking and direct navigation.
 */

import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { ProductDetailPage } from '@/features/admin/products/v2/ProductDetailPage';

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ProductPage({ params }: PageProps) {
  await requireSystemAdmin('/admin');
  const { productId } = await params;

  return <ProductDetailPage productId={productId} />;
}
