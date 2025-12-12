'use client';

import { SessionsPage } from '@/features/admin/participants/SessionsPage';
import { useRouter } from 'next/navigation';

type PageProps = {
  params: { tenantId: string };
};

export default function TenantSessionsRoute({ params }: PageProps) {
  const router = useRouter();
  const { tenantId } = params;
  return <SessionsPage tenantId={tenantId} onSelectSession={(id) => router.push(`/admin/sessions/${id}`)} />;
}
