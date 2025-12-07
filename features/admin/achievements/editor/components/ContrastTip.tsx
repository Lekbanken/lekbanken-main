'use client';

import { LightBulbIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { getContrastRatio } from '../hooks/useContrastCheck';

type ContrastTipProps = {
  /** Förgrundsfärg (t.ex. symbol) */
  foreground: string;
  /** Bakgrundsfärg (t.ex. bas) */
  background: string;
  /** Visa alltid, även vid bra kontrast */
  showAlways?: boolean;
  /** Kompakt variant */
  compact?: boolean;
};

function getContrastLabel(ratio: number): string {
  if (ratio >= 7) return 'Utmärkt';
  if (ratio >= 4.5) return 'Bra';
  if (ratio >= 3) return 'Acceptabel';
  return 'Låg';
}

/**
 * Visar ett mjukt tips om kontrastförhållandet mellan färger.
 * Använder 💡 istället för ⚠️ för att vara mindre skrämmande.
 */
export function ContrastTip({ 
  foreground, 
  background, 
  showAlways = false,
  compact = false 
}: ContrastTipProps) {
  const contrast = getContrastRatio(foreground, background);
  const meetsAA = contrast >= 4.5;
  const meetsAAA = contrast >= 7;
  const label = getContrastLabel(contrast);

  // Don't show anything if contrast is good (unless showAlways)
  if (meetsAA && !showAlways) {
    return null;
  }

  // Color based on contrast level
  const getColors = () => {
    if (meetsAAA) return { bg: 'bg-green-50', text: 'text-green-700', icon: '✅' };
    if (meetsAA) return { bg: 'bg-blue-50', text: 'text-blue-700', icon: '👍' };
    if (contrast >= 3) return { bg: 'bg-amber-50', text: 'text-amber-700', icon: '💡' };
    return { bg: 'bg-orange-50', text: 'text-orange-700', icon: '💡' };
  };

  const colors = getColors();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}>
        <span>{colors.icon}</span>
        <span>{label}</span>
        <span className="opacity-60">({contrast.toFixed(1)}:1)</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-3 ${colors.bg}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          <LightBulbIcon className={`h-4 w-4 ${colors.text}`} />
        </div>
        <div className="flex-1 space-y-1">
          <p className={`text-sm font-medium ${colors.text}`}>
            {colors.icon} Kontrast: {label}
          </p>
          <p className="text-xs text-muted-foreground">
            Kontrastförhållande {contrast.toFixed(2)}:1. 
            {!meetsAA && ' Överväg att använda mer kontrasterande färger för bättre synlighet.'}
            {meetsAA && !meetsAAA && ' Bra för de flesta användningsområden.'}
            {meetsAAA && ' Utmärkt synlighet.'}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline version for use next to color pickers
 */
type ContrastIndicatorProps = {
  foreground: string;
  background: string;
};

export function ContrastIndicator({ foreground, background }: ContrastIndicatorProps) {
  const contrast = getContrastRatio(foreground, background);
  const meetsAA = contrast >= 4.5;
  const meetsAAA = contrast >= 7;
  
  const getIcon = () => {
    if (meetsAAA) return '🟢';
    if (meetsAA) return '🟡';
    if (contrast >= 3) return '🟠';
    return '🔴';
  };

  return (
    <span 
      className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      title={`Kontrast: ${contrast.toFixed(2)}:1`}
    >
      <span>{getIcon()}</span>
      <span>{contrast.toFixed(1)}:1</span>
    </span>
  );
}

/**
 * Full contrast panel for theme/color step
 */
type ContrastPanelProps = {
  layers: Array<{ name: string; color: string }>;
  baseColor: string;
};

export function ContrastPanel({ layers, baseColor }: ContrastPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <InformationCircleIcon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium text-foreground">Färgkontrast</h4>
      </div>
      
      <div className="grid gap-1.5">
        {layers.map((layer) => (
          <div 
            key={layer.name}
            className="flex items-center justify-between px-2 py-1 rounded-lg bg-muted/30"
          >
            <span className="text-xs text-muted-foreground">{layer.name} mot bas:</span>
            <ContrastIndicator foreground={layer.color} background={baseColor} />
          </div>
        ))}
      </div>
    </div>
  );
}
