import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/server-context';
import { MarketingAdminPage } from '@/features/admin/marketing/MarketingAdminPage';

export default async function AdminMarketingUpdatesPage() {
  const authContext = await getServerAuthContext('/admin/marketing/updates');
  
  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin/marketing/updates');
  }
  
  if (authContext.effectiveGlobalRole !== 'system_admin') {
    redirect('/admin');
  }
  
  return <MarketingAdminPage defaultTab="updates" />;
}
