'use client';

import { use } from 'react';
import { SessionsPage } from '@/features/admin/participants/SessionsPage';
import { useRouter } from 'next/navigation';

type PageProps = {
  params: Promise<{ tenantId: string }>;
};

export default function TenantSessionsRoute({ params }: PageProps) {
  const { tenantId } = use(params);
  const router = useRouter();
  return <SessionsPage tenantId={tenantId} onSelectSession={(id) => router.push(`/admin/sessions/${id}`)} />;
}
