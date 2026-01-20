'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { PhotoIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';

type Media = {
  id: string;
  name: string;
  url: string;
  alt_text: string | null;
};

type StandardImagePickerProps = {
  mainPurposeId: string | null;
  mainPurposeName: string | null;
  selectedMediaId: string | null;
  selectedUrl: string | null;
  onSelect: (mediaId: string, url: string) => void;
  onClear: () => void;
};

export function StandardImagePicker({
  mainPurposeId,
  mainPurposeName,
  selectedMediaId,
  selectedUrl,
  onSelect,
  onClear,
}: StandardImagePickerProps) {
  const t = useTranslations('admin.games.builder.standardImagePicker');

  const [templates, setTemplates] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mainPurposeId) {
      setTemplates([]);
      return;
    }

    const loadTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          type: 'template',
          mainPurposeId,
        });
        const res = await fetch(`/api/media?${params}`);
        if (!res.ok) throw new Error(t('loadError'));
        const data = await res.json();
        setTemplates(data.media || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadError'));
      } finally {
        setLoading(false);
      }
    };

    void loadTemplates();
  }, [mainPurposeId, t]);

  if (!mainPurposeId) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <PhotoIcon className="h-5 w-5" />
          <span className="text-sm">{t('selectPurposeHint')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {t('coverImageLabel')}
        </label>
        {selectedMediaId && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            {t('clearImage')}
          </Button>
        )}
      </div>

      {/* Current selection preview */}
      {selectedUrl && (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <div className="relative h-12 w-20 overflow-hidden rounded-md border border-border">
            <Image
              src={selectedUrl}
              alt={t('selectedCoverImageAlt')}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('selectedCoverImageTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('selectedCoverImageDescription')}</p>
          </div>
          <CheckCircleIcon className="h-5 w-5 text-primary" />
        </div>
      )}

      {/* Standard images grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t('standardImagesFor')}{' '}
            <span className="font-medium">{mainPurposeName}</span>
          </span>
          {loading && <ArrowPathIcon className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-2">
            {error}
          </div>
        )}

        {!loading && templates.length === 0 && !error && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
            {t('noStandardImagesFound')}
          </div>
        )}

        {templates.length > 0 && (
          <div className="grid grid-cols-5 gap-2">
            {templates.map((media) => (
              <button
                key={media.id}
                type="button"
                onClick={() => onSelect(media.id, media.url)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  selectedMediaId === media.id
                    ? 'border-primary ring-2 ring-primary shadow-md'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Image
                  src={media.url}
                  alt={media.alt_text || media.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 20vw, 100px"
                />
                {selectedMediaId === media.id && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
