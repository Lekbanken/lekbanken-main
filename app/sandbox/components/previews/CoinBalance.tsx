'use client';

import { useColors, useSpacing } from '../../store/sandbox-store';

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
              <div
                className="flex items-center justify-center font-bold text-white"
                style={{
                  width: px,
                  height: px,
                  borderRadius: '50%',
                  background: `linear-gradient(145deg, hsl(${accentHue}, 80%, 55%), hsl(${accentHue}, 70%, 40%))`,
                  boxShadow: `0 2px 8px hsl(${accentHue}, 60%, 30%, 0.4)`,
                  fontSize: px * 0.4,
                }}
              >
                L
              </div>
              <span className="text-[10px] uppercase text-muted-foreground">{size}</span>
            </div>
          );
        })}
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
            <div
              className="flex h-6 w-6 items-center justify-center text-xs font-bold text-white"
              style={{
                borderRadius: '50%',
                background: `linear-gradient(145deg, hsl(${accentHue}, 80%, 55%), hsl(${accentHue}, 70%, 40%))`,
              }}
            >
              L
            </div>
            <span className="font-semibold tabular-nums">1,250</span>
          </div>

          {/* With label */}
          <div
            className="flex items-center gap-3 border border-border bg-card p-3"
            style={{ borderRadius }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center text-sm font-bold text-white"
              style={{
                borderRadius: '50%',
                background: `linear-gradient(145deg, hsl(${accentHue}, 80%, 55%), hsl(${accentHue}, 70%, 40%))`,
              }}
            >
              L
            </div>
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
                <div
                  className="flex h-12 w-12 items-center justify-center text-lg font-bold text-white"
                  style={{
                    borderRadius: '50%',
                    background: `linear-gradient(145deg, hsl(${accentHue}, 80%, 55%), hsl(${accentHue}, 70%, 40%))`,
                    boxShadow: `0 2px 8px hsl(${accentHue}, 60%, 30%, 0.3)`,
                  }}
                >
                  L
                </div>
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
