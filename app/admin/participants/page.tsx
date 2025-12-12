 'use client';

import { useRouter } from 'next/navigation';
import { ParticipantsPage } from '@/features/admin/participants/ParticipantsPage';

export default function ParticipantsRoute() {
  const router = useRouter();
  return <ParticipantsPage onSelectParticipant={(id) => router.push(`/admin/participants/${id}`)} />;
}
