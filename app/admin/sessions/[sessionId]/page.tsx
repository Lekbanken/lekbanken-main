import { SessionDetailPage } from '@/features/admin/participants/SessionDetailPage';

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionDetailRoute({ params }: PageProps) {
  const { sessionId } = await params;
  return <SessionDetailPage sessionId={sessionId} />;
}
