'use client';

import { use } from 'react';
import { ParticipantsPage } from '@/features/admin/participants/ParticipantsPage';
import { useRouter } from 'next/navigation';

type PageProps = {
  params: Promise<{ tenantId: string }>;
};

export default function TenantParticipantsRoute({ params }: PageProps) {
  const { tenantId } = use(params);
  const router = useRouter();
  return (
    <ParticipantsPage
      tenantId={tenantId}
      onSelectParticipant={(id) => router.push(`/admin/participants/${id}`)}
    />
  );
}
