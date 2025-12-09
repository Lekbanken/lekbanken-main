'use client';

import { useTypography } from '../../store/sandbox-store';
import { getFontFamily, calculateTypeScale } from '../../tokens/fonts';

const headingLevels = [
  { tag: 'h1', label: 'Display' },
  { tag: 'h2', label: 'Headline 1' },
  { tag: 'h3', label: 'Headline 2' },
  { tag: 'h4', label: 'Headline 3' },
  { tag: 'h5', label: 'Title' },
  { tag: 'h6', label: 'Subtitle' },
] as const;

export function HeadingRamp() {
  const { fontPrimary, baseFontSize, typeScaleRatio, fontWeight, lineHeight } = useTypography();
  const fontFamily = getFontFamily(fontPrimary);

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Heading Ramp
      </div>
      <div className="space-y-4">
        {headingLevels.map((level, idx) => {
          // Calculate step: h1 = +4, h2 = +3, ... h6 = -1
          const step = 4 - idx;
          const size = calculateTypeScale(baseFontSize, typeScaleRatio, step);
          
          return (
            <div key={level.tag} className="group">
              <div className="mb-1 flex items-baseline gap-2">
                <span className="w-8 text-[10px] font-medium uppercase text-muted-foreground">
                  {level.tag}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {size.toFixed(1)}px
                </span>
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: `${size}px`,
                  fontWeight,
                  lineHeight,
                }}
                className="text-foreground"
              >
                {level.label} – The quick brown fox
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
