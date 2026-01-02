'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getAnimationDuration } from '@/lib/accessibility/a11y-utils';
import { cn } from '@/lib/utils';

const ROLL_DURATION_MS = 900;

function rollD6(): number {
  // Compute-first: final result is decided immediately on click.
  return Math.floor(Math.random() * 6) + 1;
}

export function DiceRollerV1() {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [computedResult, setComputedResult] = useState<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const durationMs = useMemo(() => getAnimationDuration(ROLL_DURATION_MS), []);

  const startRoll = () => {
    if (rolling) return;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const next = rollD6();
    setComputedResult(next);
    setResult(null);

    if (durationMs === 0) {
      setResult(next);
      setComputedResult(null);
      return;
    }

    setRolling(true);
    timeoutRef.current = window.setTimeout(() => {
      setRolling(false);
      setResult(next);
      setComputedResult(null);
      timeoutRef.current = null;
    }, durationMs);
  };

  // Map each face to a 3D transform using CSS variables.
  const faceTransform = useMemo(() => {
    const face = result ?? computedResult;
    switch (face) {
      case 1:
        return 'rotateX(0deg) rotateY(0deg)';
      case 2:
        return 'rotateX(-90deg) rotateY(0deg)';
      case 3:
        return 'rotateX(0deg) rotateY(90deg)';
      case 4:
        return 'rotateX(0deg) rotateY(-90deg)';
      case 5:
        return 'rotateX(90deg) rotateY(0deg)';
      case 6:
        return 'rotateX(0deg) rotateY(180deg)';
      default:
        return 'rotateX(0deg) rotateY(0deg)';
    }
  }, [result, computedResult]);

  const showFinal = result !== null && !rolling;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Dice Roller</h3>
          <p className="text-xs text-muted-foreground">
            Resultatet bestäms direkt, sedan spelas en kort animation.
          </p>
        </div>
        <Button type="button" size="sm" onClick={startRoll} disabled={rolling}>
          {rolling ? 'Rullar…' : 'Rulla'}
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <div
          className="relative"
          style={{
            perspective: '700px',
            width: 96,
            height: 96,
          }}
        >
          <div
            className={cn(
              'absolute inset-0',
              rolling
                ? 'animate-[toolbelt_dice_spin_900ms_ease-in-out_infinite]'
                : 'transition-transform duration-300 ease-out'
            )}
            style={{
              transformStyle: 'preserve-3d',
              transform: rolling ? undefined : faceTransform,
            }}
          >
            <DieFace label="1" className="[transform:rotateY(0deg)_translateZ(36px)]" />
            <DieFace label="2" className="[transform:rotateX(90deg)_translateZ(36px)]" />
            <DieFace label="3" className="[transform:rotateY(-90deg)_translateZ(36px)]" />
            <DieFace label="4" className="[transform:rotateY(90deg)_translateZ(36px)]" />
            <DieFace label="5" className="[transform:rotateX(-90deg)_translateZ(36px)]" />
            <DieFace label="6" className="[transform:rotateY(180deg)_translateZ(36px)]" />
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        {showFinal ? (
          <p className="text-sm">
            Resultat: <span className="font-semibold text-foreground">{result}</span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{rolling ? '…' : 'Tryck på Rulla'}</p>
        )}
      </div>

      {/* Local keyframes (no new global theme primitives) */}
      <style jsx>{`
        @keyframes toolbelt_dice_spin {
          0% {
            transform: rotateX(0deg) rotateY(0deg);
          }
          100% {
            transform: rotateX(540deg) rotateY(720deg);
          }
        }
      `}</style>
    </Card>
  );
}

function Pip({ className }: { className: string }) {
  return <span className={cn('absolute h-2.5 w-2.5 rounded-full bg-foreground/80', className)} />;
}

function DieFace({ label, className }: { label: '1' | '2' | '3' | '4' | '5' | '6'; className: string }) {
  return (
    <div
      className={cn(
        'absolute inset-0 rounded-2xl border border-border bg-card shadow-sm',
        'flex items-center justify-center',
        className
      )}
    >
      <div className="relative h-10 w-10">
        {label === '1' && <Pip className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />}

        {label === '2' && (
          <>
            <Pip className="left-1 top-1" />
            <Pip className="right-1 bottom-1" />
          </>
        )}

        {label === '3' && (
          <>
            <Pip className="left-1 top-1" />
            <Pip className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Pip className="right-1 bottom-1" />
          </>
        )}

        {label === '4' && (
          <>
            <Pip className="left-1 top-1" />
            <Pip className="right-1 top-1" />
            <Pip className="left-1 bottom-1" />
            <Pip className="right-1 bottom-1" />
          </>
        )}

        {label === '5' && (
          <>
            <Pip className="left-1 top-1" />
            <Pip className="right-1 top-1" />
            <Pip className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            <Pip className="left-1 bottom-1" />
            <Pip className="right-1 bottom-1" />
          </>
        )}

        {label === '6' && (
          <>
            <Pip className="left-1 top-1" />
            <Pip className="right-1 top-1" />
            <Pip className="left-1 top-1/2 -translate-y-1/2" />
            <Pip className="right-1 top-1/2 -translate-y-1/2" />
            <Pip className="left-1 bottom-1" />
            <Pip className="right-1 bottom-1" />
          </>
        )}
      </div>
    </div>
  );
}
