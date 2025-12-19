'use client';

import Image from 'next/image';
import { useColors, useSpacing } from '../../store/sandbox-store';
import { CoinIdle } from '@/components/CoinIdle';

const coinPngSrc = '/icons/app-nav/lekvaluta.png';

export function CoinBalance() {
  const { accentHue } = useColors();
  const { borderRadius } = useSpacing();

  return (
    <div className="space-y-6">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Lekvalutan Coin
      </div>

      {/* Coin sizes */}
      <div className="flex items-end gap-6">
        {['sm', 'md', 'lg', 'xl'].map((size) => {
          const sizeMap = { sm: 24, md: 32, lg: 48, xl: 64 };
          const px = sizeMap[size as keyof typeof sizeMap];
          return (
            <div key={size} className="flex flex-col items-center gap-2">
              <Image
                src={coinPngSrc}
                alt="Lekvaluta"
                width={px}
                height={px}
                className="block"
              />
              <span className="text-[10px] uppercase text-muted-foreground">{size}</span>
            </div>
          );
        })}
      </div>

      {/* Fake-3D idle rotation (1 image + CSS) */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Coin idle (CSS)
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <CoinIdle size={32} ariaLabel="Lekvaluta" />
            <span className="text-xs text-muted-foreground">32px</span>
          </div>
          <div className="flex items-center gap-3">
            <CoinIdle size={48} ariaLabel="Lekvaluta" />
            <span className="text-xs text-muted-foreground">48px</span>
          </div>
          <div className="flex items-center gap-3">
            <CoinIdle size={64} ariaLabel="Lekvaluta" />
            <span className="text-xs text-muted-foreground">64px</span>
          </div>
        </div>
      </div>

      {/* Balance display variations */}
      <div className="space-y-4 border-t border-border pt-4">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Balance Display
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Compact */}
          <div
            className="flex items-center gap-2 border border-border bg-card p-3"
            style={{ borderRadius }}
          >
            <Image src={coinPngSrc} alt="Lekvaluta" width={24} height={24} className="block" />
            <span className="font-semibold tabular-nums">1,250</span>
          </div>

          {/* With label */}
          <div
            className="flex items-center gap-3 border border-border bg-card p-3"
            style={{ borderRadius }}
          >
            <Image src={coinPngSrc} alt="Lekvaluta" width={32} height={32} className="block" />
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Balance</span>
              <span className="font-semibold tabular-nums">1,250</span>
            </div>
          </div>

          {/* Large card */}
          <div
            className="col-span-full border border-border bg-card p-4"
            style={{ borderRadius }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Image src={coinPngSrc} alt="Lekvaluta" width={48} height={48} className="block" />
                <div>
                  <div className="text-sm text-muted-foreground">Lekvalutan</div>
                  <div className="text-2xl font-bold tabular-nums">1,250</div>
                </div>
              </div>
              <button
                className="px-4 py-2 text-sm font-medium text-white"
                style={{
                  borderRadius,
                  backgroundColor: `hsl(${accentHue}, 70%, 50%)`,
                }}
              >
                Earn more
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
