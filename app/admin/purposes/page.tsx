import { redirect } from 'next/navigation';
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';

/**
 * Legacy route: redirects to the new Products hub with Purposes tab active.
 */
export default async function PurposesRedirect() {
  await requireSystemAdmin('/admin');
  redirect('/admin/products?tab=purposes');
}
