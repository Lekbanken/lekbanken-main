import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin'
import { ProductAdminPage } from "@/features/admin/products/ProductAdminPage";

export default async function ProductsPage() {
  await requireSystemAdmin('/admin')
  return <ProductAdminPage />;
}
