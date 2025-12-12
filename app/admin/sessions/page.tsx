'use client';

import { SessionsPage } from '@/features/admin/participants/SessionsPage';
import { useRouter } from 'next/navigation';

export default function SessionsRoute() {
  const router = useRouter();
  return <SessionsPage onSelectSession={(id) => router.push(`/admin/sessions/${id}`)} />;
}
