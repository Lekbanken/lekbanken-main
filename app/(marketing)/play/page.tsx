import type { Metadata } from 'next';
import { PlayJoinClient } from './client';

export const metadata: Metadata = {
  title: 'Gå med i session | Lekbanken',
  description: 'Ange sessionskoden för att gå med i en interaktiv session.',
};

export default function PlayJoinPage() {
  return <PlayJoinClient />;
}
