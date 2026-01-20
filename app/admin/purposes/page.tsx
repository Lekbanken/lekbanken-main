import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import PurposesLegacyPage from './_legacy-page';

export default async function PurposesPage() {
  await requireSystemAdmin('/admin');
  return <PurposesLegacyPage />;
}
