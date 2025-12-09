'use client';

import { useTypography } from '../../store/sandbox-store';
import { getFontFamily } from '../../tokens/fonts';

const sampleText = `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! Sphinx of black quartz, judge my vow.`;

export function BodyTextPreview() {
  const { fontSecondary, baseFontSize, fontWeight, lineHeight, letterSpacing } = useTypography();
  const fontFamily = getFontFamily(fontSecondary);

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Body Text
      </div>

      <div
        style={{
          fontFamily,
          fontSize: `${baseFontSize}px`,
          fontWeight,
          lineHeight,
          letterSpacing: `${letterSpacing}em`,
        }}
        className="text-foreground"
      >
        <p className="mb-4">{sampleText}</p>
        <p className="text-muted-foreground">
          Secondary text styling with muted foreground. Used for descriptions, hints, and
          supporting content throughout the interface.
        </p>
      </div>

      {/* Text sizes */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Text Sizes
        </div>
        <div className="space-y-2" style={{ fontFamily }}>
          <p style={{ fontSize: baseFontSize * 0.75 }} className="text-muted-foreground">
            XS ({(baseFontSize * 0.75).toFixed(0)}px) – Fine print and labels
          </p>
          <p style={{ fontSize: baseFontSize * 0.875 }} className="text-muted-foreground">
            SM ({(baseFontSize * 0.875).toFixed(0)}px) – Captions and metadata
          </p>
          <p style={{ fontSize: baseFontSize }} className="text-foreground">
            Base ({baseFontSize}px) – Default body text
          </p>
          <p style={{ fontSize: baseFontSize * 1.125 }} className="text-foreground">
            LG ({(baseFontSize * 1.125).toFixed(0)}px) – Lead paragraphs
          </p>
          <p style={{ fontSize: baseFontSize * 1.25 }} className="text-foreground">
            XL ({(baseFontSize * 1.25).toFixed(0)}px) – Emphasis text
          </p>
        </div>
      </div>
    </div>
  );
}
