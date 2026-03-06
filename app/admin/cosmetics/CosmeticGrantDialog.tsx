'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  cosmeticId: string | null;
}

export function CosmeticGrantDialog({ open, onClose, cosmeticId }: Props) {
  const t = useTranslations('admin.gamification.cosmetics.grant');

  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleGrant() {
    if (!cosmeticId || !userId || !reason) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/cosmetics/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cosmeticId, userId, reason }),
      });

      if (res.ok) {
        const json = await res.json();
        setResult({ type: 'success', message: json.message ?? t('success') });
        setUserId('');
        setReason('');
      } else {
        const json = await res.json();
        setResult({ type: 'error', message: json.error ?? t('error') });
      }
    } catch {
      setResult({ type: 'error', message: t('error') });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !cosmeticId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{t('title')}</h2>

        <div className="space-y-4">
          {/* User ID */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('userSearch')}</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="User UUID"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t('reason')}</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reasonPlaceholder')}
            />
          </div>

          {/* Result message */}
          {result && (
            <p className={`text-sm ${result.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {result.message}
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {t('title') === t('title') ? 'Close' : 'Close'}
          </Button>
          <Button onClick={handleGrant} disabled={submitting || !userId || !reason}>
            {t('submit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
