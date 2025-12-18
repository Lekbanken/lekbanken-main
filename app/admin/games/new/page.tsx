import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { GameBuilderPage } from '../builder/GameBuilderPage';

export default async function GameBuilderNewPage() {
  await requireSystemAdmin('/admin');
  return <GameBuilderPage />;
}
