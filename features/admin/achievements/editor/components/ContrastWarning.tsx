'use client';

import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';
import { checkBadgeContrast } from '../hooks/useContrastCheck';

type ContrastWarningProps = {
  colors: {
    base: string;
    background: string;
    symbol: string;
  };
  onAutoFix?: (suggestion: string, layer: 'symbol' | 'base') => void;
};

/**
 * Displays accessibility warnings when color contrast is too low.
 * Provides auto-fix suggestions.
 */
export function ContrastWarning({ colors, onAutoFix }: ContrastWarningProps) {
  const t = useTranslations('admin.achievements.editor');
  const result = checkBadgeContrast(colors);

  if (result.overallAccessible) {
    return null;
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-amber-800">{t('contrast.lowContrast')}</p>
          
          {!result.symbolOnBase.passes && (
            <div className="text-xs text-amber-700">
              <p>{t('contrast.symbolHardToSee')}</p>
              <p className="text-muted-foreground">
                {t('contrast.ratio')}: {result.symbolOnBase.ratio.toFixed(1)}:1 ({t('contrast.recommended')}: 4.5:1)
              </p>
              {result.symbolOnBase.suggestion && onAutoFix && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1.5 h-6 text-xs"
                  onClick={() => {
                    const match = result.symbolOnBase.suggestion?.match(/#[a-fA-F0-9]{6}/);
                    if (match) onAutoFix(match[0], 'symbol');
                  }}
                >
                  {t('contrast.suggestFix')}
                </Button>
              )}
            </div>
          )}

          {!result.baseOnBackground.passes && (
            <div className="text-xs text-amber-700">
              <p>{t('contrast.baseMayBlend')}</p>
              <p className="text-muted-foreground">
                {t('contrast.ratio')}: {result.baseOnBackground.ratio.toFixed(1)}:1
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Success indicator when contrast is good
 */
export function ContrastSuccess() {
  const t = useTranslations('admin.achievements.editor');
  return (
    <div className="flex items-center gap-1.5 text-xs text-green-600">
      <CheckCircleIcon className="h-4 w-4" />
      <span>{t('contrast.goodContrast')}</span>
    </div>
  );
}
