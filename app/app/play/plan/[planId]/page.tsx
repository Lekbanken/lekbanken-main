import { PlayPlanPage } from "@/features/play/PlayPlanPage";

export default function PlayPlanRoute({ params }: { params: { planId: string } }) {
  return <PlayPlanPage planId={params.planId} />;
}
