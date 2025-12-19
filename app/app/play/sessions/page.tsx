import type { Metadata } from 'next';
import { HostSessionsClient } from './client';

export const metadata: Metadata = {
  title: 'Mina sessioner | Lekbanken',
  description: 'Hantera dina aktiva och avslutade sessioner.',
};

export default function HostSessionsPage() {
  return <HostSessionsClient />;
}
