'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

const SCREENSHOT_KEYS = ['browse', 'play', 'planner', 'inGame', 'journey'] as const;
const SCREENSHOT_SRCS = [
  '/header-phone/browse2 (1).webp',
  '/header-phone/play2 (1).webp',
  '/header-phone/planner2 (1).webp',
  '/header-phone/in_game2 (1).webp',
  '/header-phone/journey2 (1).webp',
] as const;

const FEATURE_ICONS = [
  { src: '/icons/app-nav/browse_v2.webp', key: 'browse' as const },
  { src: '/icons/app-nav/play_v2.webp', key: 'play' as const },
  { src: '/icons/app-nav/planner_v4.webp', key: 'plan' as const },
];

const INTERVAL_MS = 4500;

export function HeroV2() {
  const t = useTranslations('marketing');

  // Parse action words from i18n (stored as JSON array)
  const actionWords: string[] = SCREENSHOT_KEYS.map((_, i) =>
    t(`hero.actionWords.${i}`)
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [ready, setReady] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wordMeasureRef = useRef<HTMLSpanElement>(null);
  const [wordWidth, setWordWidth] = useState<number | undefined>(undefined);

  // Mark ready after first paint + first image load
  useEffect(() => {
    const img = new window.Image();
    img.src = SCREENSHOT_SRCS[0];
    const done = () => setReady(true);
    if (img.complete) { done(); } else { img.onload = done; img.onerror = done; }
  }, []);

  // Measure active word width
  useEffect(() => {
    if (wordMeasureRef.current) {
      setWordWidth(wordMeasureRef.current.offsetWidth);
    }
  }, [activeIndex]);

  const goTo = useCallback((next: number, dir: 'left' | 'right' = 'left') => {
    setDirection(dir);
    setPrevIndex(activeIndex);
    setActiveIndex(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPrevIndex(null), 600);
  }, [activeIndex]);

  const advance = useCallback(() => {
    goTo((activeIndex + 1) % SCREENSHOT_KEYS.length, 'left');
  }, [activeIndex, goTo]);

  useEffect(() => {
    const id = setInterval(advance, INTERVAL_MS);
    return () => clearInterval(id);
  }, [advance]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const activeWord = actionWords[activeIndex % actionWords.length];
  const prevWord = prevIndex !== null ? actionWords[prevIndex % actionWords.length] : null;

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#8661ff]/5 via-white to-gray-50/50">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-[#8661ff]/[0.06] blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-[500px] w-[500px] rounded-full bg-[#00c7b0]/[0.06] blur-3xl" />
      </div>

      {/* Skeleton placeholder — shown while loading */}
      {!ready && (
        <div className="mx-auto max-w-7xl px-6 py-12 sm:py-20 lg:py-28 lg:px-8" aria-hidden>
          <div className="flex flex-col items-center lg:flex-row lg:items-center lg:gap-x-16">
            {/* Skeleton phone (shown first on mobile) */}
            <div className="mx-auto w-full max-w-[240px] sm:max-w-[280px] lg:order-2 lg:max-w-[300px]">
              <div className="aspect-[380/780] w-full animate-pulse rounded-[2rem] bg-gray-200" />
              <div className="mt-4 flex justify-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`h-2 rounded-full bg-gray-200 ${i === 0 ? 'w-6' : 'w-2'}`} />
                ))}
              </div>
            </div>
            {/* Skeleton text */}
            <div className="mt-10 w-full max-w-2xl lg:order-1 lg:mt-0 lg:flex-auto">
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-gray-200 sm:h-14" />
              <div className="mt-2 h-10 w-1/2 animate-pulse rounded-lg bg-gray-200 sm:h-14" />
              <div className="mt-6 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              <div className="mt-8 h-12 w-48 animate-pulse rounded-lg bg-gray-200" />
              <div className="mt-8 flex gap-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
                    <div className="h-3 w-12 animate-pulse rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real content — fade in when ready */}
      <div
        className={`mx-auto max-w-7xl px-6 py-12 sm:py-20 lg:px-8 lg:py-28 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-16">
        {/* Text column — order-2 on mobile (phone first), order-1 on desktop */}
        <div className="order-2 mx-auto mt-10 max-w-2xl sm:mt-14 lg:order-1 lg:mx-0 lg:mt-0 lg:flex-auto">
          {/* Headline */}
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {/* Width-measuring hidden span */}
            <span className="invisible absolute whitespace-nowrap" aria-hidden ref={wordMeasureRef}>
              {activeWord}
            </span>
            {/* Animated word container */}
            <span
              className="relative inline-block overflow-hidden align-bottom"
              style={{
                height: '1.2em',
                width: wordWidth ? `${wordWidth}px` : 'auto',
                transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                verticalAlign: 'bottom',
              }}
            >
              <span
                key={`word-${activeIndex}`}
                className="absolute left-0 bottom-0 word-enter"
              >
                {activeWord}
              </span>
              {prevWord !== null && (
                <span
                  key={`word-out-${prevIndex}`}
                  className="absolute left-0 bottom-0 word-exit"
                >
                  {prevWord}
                </span>
              )}
            </span>{' '}
            {t.rich('hero.title', {
              word: () => null,
              highlight: (chunks) => (
                <span className="bg-gradient-to-r from-[#8661ff] via-[#00c7b0] to-[#8661ff] bg-clip-text text-transparent">
                  {chunks}
                </span>
              ),
            })}
          </h1>

          {/* Description */}
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:mt-6 sm:text-lg">
            {t('hero.description')}
          </p>
          <p className="mt-3 border-l-2 border-[#8661ff]/40 pl-4 text-sm italic text-gray-500">
            {t('hero.quote')}
          </p>

          {/* CTA */}
          <div className="mt-6 sm:mt-8">
            <Button
              size="lg"
              href="/demo"
              className="w-full bg-[#6f46ff] shadow-lg shadow-[#6f46ff]/25 transition-all duration-200 hover:bg-[#5f36ef] hover:shadow-xl hover:shadow-[#6f46ff]/30 hover:scale-[1.02] sm:w-auto"
            >
              {t('hero.cta')}
            </Button>
          </div>

          {/* Feature icons */}
          <div className="mt-8 flex items-center gap-8 sm:mt-10">
            {FEATURE_ICONS.map((item) => (
              <div key={item.key} className="flex flex-col items-center gap-1.5">
                <Image
                  src={item.src}
                  alt={t(`hero.features.${item.key}`)}
                  width={36}
                  height={36}
                  className="drop-shadow-md sm:h-10 sm:w-10"
                />
                <span className="text-xs font-medium text-gray-600">
                  {t(`hero.features.${item.key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Phone column — order-1 on mobile (first), order-2 on desktop */}
        <div className="order-1 relative mx-auto w-full max-w-[240px] flex-none sm:max-w-[280px] lg:order-2 lg:mt-0 lg:max-w-[300px]">
          {/* Glow behind phone */}
          <div
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-[#8661ff]/20 via-[#00c7b0]/10 to-[#ffd166]/10 blur-3xl animate-pulse"
            aria-hidden
          />

          {/* Floating particles */}
          <div className="absolute -inset-12 -z-10 hidden sm:block" aria-hidden>
            <div className="absolute left-4 top-12 h-2 w-2 rounded-full bg-[#8661ff]/40 animate-float-slow" />
            <div className="absolute right-8 top-24 h-1.5 w-1.5 rounded-full bg-[#00c7b0]/50 animate-float-medium" />
            <div className="absolute left-0 bottom-32 h-2.5 w-2.5 rounded-full bg-[#ffd166]/40 animate-float-slow" />
            <div className="absolute right-2 bottom-16 h-1.5 w-1.5 rounded-full bg-[#8661ff]/30 animate-float-medium" />
            <div className="absolute left-1/2 top-4 h-2 w-2 rounded-full bg-[#00c7b0]/30 animate-float-slow" />
          </div>

          {/* Phone container */}
          <div className="phone-mockup-container relative">
            {/* Screenshots layer */}
            <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
              {SCREENSHOT_SRCS.map((src, i) => {
                const isActive = i === activeIndex;
                const isLeaving = i === prevIndex;
                const visible = isActive || isLeaving;

                let translateX = '100%';
                if (isActive) {
                  translateX = '0%';
                } else if (isLeaving) {
                  translateX = direction === 'left' ? '-100%' : '100%';
                } else {
                  translateX = direction === 'left' ? '100%' : '-100%';
                }

                return (
                  <div
                    key={src}
                    className="absolute inset-0"
                    style={{
                      transform: `translateX(${translateX})`,
                      transition: visible ? 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                      zIndex: isActive ? 2 : isLeaving ? 1 : 0,
                    }}
                  >
                    <Image
                      src={src}
                      alt={t(`hero.screenshots.${SCREENSHOT_KEYS[i]}`)}
                      fill
                      sizes="(max-width: 640px) 240px, 300px"
                      className="object-cover object-top"
                      priority={i === 0}
                    />
                  </div>
                );
              })}
            </div>

            {/* Phone frame overlay */}
            <Image
              src="/header-phone/phone_mock (1).webp"
              alt={t('hero.phoneAlt')}
              width={380}
              height={780}
              className="relative z-10 w-full h-auto pointer-events-none select-none drop-shadow-2xl"
              priority
            />
          </div>

          {/* Dot indicators */}
          <div className="mt-4 flex justify-center gap-2">
            {SCREENSHOT_SRCS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={t('hero.dotLabel', { index: i + 1 })}
                onClick={() => goTo(i, i > activeIndex ? 'left' : 'right')}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-6 bg-[#8661ff]'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Custom animation keyframes */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.4; }
          50% { transform: translateY(-12px) scale(1.2); opacity: 0.7; }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-8px) scale(1.1); opacity: 0.6; }
        }
        :global(.animate-float-slow) {
          animation: float-slow 6s ease-in-out infinite;
        }
        :global(.animate-float-medium) {
          animation: float-medium 4s ease-in-out infinite;
        }
        @keyframes word-enter {
          0% { transform: translateY(110%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes word-exit {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-110%); opacity: 0; }
        }
        :global(.word-enter) {
          animation: word-enter 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        :global(.word-exit) {
          animation: word-exit 500ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </section>
  );
}
