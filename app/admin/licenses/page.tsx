import { redirect } from 'next/navigation';
import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';

/**
 * Legacy route: redirects to the new Products hub with Licenses tab active.
 */
export default async function LicensesRedirect() {
  await requireSystemAdmin('/admin');
  redirect('/admin/products?tab=licenses');
}
