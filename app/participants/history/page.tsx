/**
 * Session History Page
 * 
 * /participants/history
 * Main page for viewing all past sessions
 */

'use client';

import { useTranslations } from 'next-intl';
import { SessionHistoryViewer } from '@/features/participants/components/SessionHistoryViewer';

export default function SessionHistoryPage() {
  const t = useTranslations('sessionHistoryPage');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('description')}
          </p>
        </div>

        <SessionHistoryViewer />
      </div>
    </div>
  );
}
