import { getAvailableCoursesForLearner } from '@/app/actions/learning';
import { LearningDashboardClient } from './LearningDashboardClient';

export default async function LearningDashboardPage() {
  // TODO: Get tenant context from user session if needed
  // For now, fetch global courses (no tenant filter)
  const data = await getAvailableCoursesForLearner();

  return <LearningDashboardClient data={data} />;
}
