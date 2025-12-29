import type { Metadata } from 'next';
import { SessionCockpit } from '@/features/play';

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: 'Session | Lekbanken',
  description: 'Hantera din session och se deltagare.',
};

export default async function HostSessionDetailPage({ params }: Props) {
  const { id } = await params;
  return <SessionCockpit sessionId={id} />;
}
