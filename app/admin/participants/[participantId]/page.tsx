import { ParticipantDetailPage } from '@/features/admin/participants/ParticipantDetailPage';

type PageProps = {
  params: Promise<{ participantId: string }>;
};

export default async function ParticipantDetailRoute({ params }: PageProps) {
  const { participantId } = await params;
  return <ParticipantDetailPage participantId={participantId} />;
}
