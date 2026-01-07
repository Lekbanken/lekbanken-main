import { requireSystemAdmin } from '@/lib/auth/requireSystemAdmin';
import { GameAdminPageV2 } from '@/features/admin/games/v2';

export default async function GamesAdminPage() {
  await requireSystemAdmin('/admin');
  return <GameAdminPageV2 />;
}
