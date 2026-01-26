import { redirect } from 'next/navigation';
import { getServerAuthContext } from '@/lib/auth/server-context';
import { MarketingAdminPage } from '@/features/admin/marketing/MarketingAdminPage';

export default async function AdminMarketingFeaturesPage() {
  const authContext = await getServerAuthContext('/admin/marketing/features');
  
  if (!authContext.user) {
    redirect('/auth/login?redirect=/admin/marketing/features');
  }
  
  if (authContext.effectiveGlobalRole !== 'system_admin') {
    redirect('/admin');
  }
  
  return <MarketingAdminPage defaultTab="features" />;
}
