import { redirect } from 'next/navigation';

/**
 * Admin Marketing Hub - redirects to features page
 */
export default function AdminMarketingPage() {
  redirect('/admin/marketing/features');
}
