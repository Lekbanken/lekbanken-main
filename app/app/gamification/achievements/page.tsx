import { getServerAuthContext } from '@/lib/auth/server-context';
import { getJourneyEnabled } from '@/lib/journey/getJourneyEnabled';
import { AchievementsOverviewPage } from "@/features/gamification/AchievementsOverviewPage";

/**
 * Proof-of-concept subroute gating:
 * If Journey is not enabled, achievements are still shown (they exist
 * in both Standard and Journey modes). This gating is a structural
 * example — in future iterations, Journey-only subroutes will redirect.
 */
export default async function Page() {
  const ctx = await getServerAuthContext();
  const _journeyEnabled = ctx.user ? await getJourneyEnabled(ctx.user.id) : false;

  // Currently achievements are accessible regardless of Journey state.
  // The gating check above is proof-of-concept infrastructure for future
  // Journey-only subroutes.
  return <AchievementsOverviewPage />;
}
