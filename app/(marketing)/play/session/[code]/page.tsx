import type { Metadata } from 'next';
import { ParticipantSessionWithPlayClient } from '@/features/play';

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Session ${code} | Lekbanken`,
    description: 'Du deltar i en interaktiv session.',
  };
}

export default async function ParticipantSessionPage({ params }: Props) {
  const { code } = await params;
  return <ParticipantSessionWithPlayClient code={code} />;
}
