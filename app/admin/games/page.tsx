import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { GameAdminPage } from '@/features/admin/games/GameAdminPage';

export default async function GamesAdminPage() {
  await requireSystemAdmin('/admin');
  return <GameAdminPage />;
}
