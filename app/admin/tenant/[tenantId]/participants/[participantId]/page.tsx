import { ParticipantDetailPage } from '@/features/admin/participants/ParticipantDetailPage';

type PageProps = {
  params: Promise<{ tenantId: string; participantId: string }>;
};

export default async function TenantParticipantDetailRoute({ params }: PageProps) {
  const { participantId } = await params;
  return <ParticipantDetailPage participantId={participantId} />;
}
