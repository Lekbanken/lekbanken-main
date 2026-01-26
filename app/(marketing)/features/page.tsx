import type { Metadata } from 'next';
import { FeaturesPageContent } from '@/components/marketing/features-page-content';

export const metadata: Metadata = {
  title: 'Funktioner | Lekbanken',
  description: 'Utforska alla Lekbankens funktioner för aktivitetsplanering, delning och säkerhet.',
};

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
