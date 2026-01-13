/**
 * Demo Banner Component
 * Persistent banner shown at top of app when in demo mode
 * Shows tier, time remaining, and upgrade CTA
 */

'use client';

import { useIsDemo, formatTimeRemaining, useConvertDemo } from '@/hooks/useIsDemo';
import { XMarkIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export function DemoBanner() {
  const {
    isDemoMode,
    tier,
    timeRemaining,
    showTimeoutWarning,
    isLoading,
  } = useIsDemo();

  const convertDemo = useConvertDemo();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not in demo or dismissed
  if (!isDemoMode || dismissed || isLoading) {
    return null;
  }

  const minutes = timeRemaining ? Math.floor(timeRemaining / 1000 / 60) : 0;
  const isWarning = showTimeoutWarning && minutes < 10;
  const isPremium = tier === 'premium';

  const handleUpgradeClick = async () => {
    await convertDemo('contact_sales', undefined, {
      source: 'demo_banner',
    });

    // Redirect to contact sales or signup
    if (isPremium) {
      window.location.href = '/contact';
    } else {
      window.location.href = '/auth/signup?source=demo';
    }
  };

  return (
    <div
      className={`
        relative w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4
        ${isWarning ? 'bg-amber-500' : isPremium ? 'bg-purple-600' : 'bg-blue-600'}
        text-white shadow-md z-50
      `}
      role="banner"
      aria-label="Demo mode notification"
    >
      {/* Left side: Icon + Message */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          {isWarning ? (
            <ClockIcon className="h-5 w-5" aria-hidden="true" />
          ) : isPremium ? (
            <SparklesIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-semibold text-sm sm:text-base">
            {isWarning ? (
              <>Demo ending in {minutes} minute{minutes !== 1 ? 's' : ''}</>
            ) : isPremium ? (
              <>Premium Demo Mode</>
            ) : (
              <>Demo Mode - Free Tier</>
            )}
          </p>
          <p className="text-xs sm:text-sm opacity-90 truncate">
            {isWarning ? (
              <>Create an account to save your progress</>
            ) : isPremium ? (
              <>Exploring all premium features</>
            ) : (
              <>
                Limited features available.{' '}
                <span className="hidden sm:inline">
                  {timeRemaining && formatTimeRemaining(timeRemaining)} remaining
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right side: CTA + Dismiss */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button
          onClick={handleUpgradeClick}
          className="
            px-3 py-1.5 sm:px-4 sm:py-2
            bg-white text-blue-600
            hover:bg-gray-100
            font-medium text-sm
            rounded-md
            transition-colors
            whitespace-nowrap
            focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
          "
        >
          {isPremium ? 'Contact Sales' : 'Create Account'}
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="
            flex-shrink-0 p-1
            hover:bg-white/20
            rounded
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-white
          "
          aria-label="Dismiss banner"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Compact version for mobile or sidebar
 */
export function DemoBannerCompact() {
  const { isDemoMode, tier, timeRemaining } = useIsDemo();

  if (!isDemoMode) {
    return null;
  }

  const isPremium = tier === 'premium';

  return (
    <div
      className={`
        px-3 py-2 flex items-center justify-between gap-2
        ${isPremium ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-900'}
        text-xs font-medium rounded-md
      `}
    >
      <span>
        {isPremium ? 'Premium ' : ''}Demo
      </span>
      {timeRemaining && (
        <span className="text-xs opacity-75">
          {formatTimeRemaining(timeRemaining)}
        </span>
      )}
    </div>
  );
}
