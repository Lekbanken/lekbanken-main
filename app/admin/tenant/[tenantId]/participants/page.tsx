'use client';

import { ParticipantsPage } from '@/features/admin/participants/ParticipantsPage';
import { useRouter } from 'next/navigation';

type PageProps = {
  params: { tenantId: string };
};

export default function TenantParticipantsRoute({ params }: PageProps) {
  const { tenantId } = params;
  const router = useRouter();
  return (
    <ParticipantsPage
      tenantId={tenantId}
      onSelectParticipant={(id) => router.push(`/admin/participants/${id}`)}
    />
  );
}
