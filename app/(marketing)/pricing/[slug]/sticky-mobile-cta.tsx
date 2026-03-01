"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// =============================================================================
// Sticky Mobile CTA — shown on sm/md only, hidden on lg+
//
// Renders a fixed bottom bar with price, optional savings badge, and CTA.
// Auto-hides when user has scrolled past the main CTA (via IntersectionObserver
// on a sentinel element with id="sticky-sentinel").
// =============================================================================

type StickyCTAProps = {
  /** Formatted price string, e.g. "2 990 kr/år" */
  priceLabel: string;
  /** Optional savings percentage (e.g. 33). Only shown when > 0 */
  savingsPercent?: number | null;
  /** Optional formatted savings label, e.g. "Spara 2 000 kr/år" */
  savingsLabel?: string;
  /** Primary CTA label */
  ctaLabel: string;
  /** Primary CTA href (Link destination) */
  ctaHref: string;
  /** Optional secondary label (shown as subtle text link) */
  secondaryLabel?: string;
  /** Secondary action: href string for <a> or <Link> */
  secondaryHref?: string;
};

export default function StickyMobileCTA({
  priceLabel,
  savingsPercent,
  savingsLabel,
  ctaLabel,
  ctaHref,
  secondaryLabel,
  secondaryHref,
}: StickyCTAProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // If there's a sentinel element, observe it — hide sticky when sentinel
    // is on-screen (meaning the user can see the main CTA)
    const sentinel = document.getElementById("sticky-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is visible → hide sticky (main CTA is in view)
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        {/* Price + savings */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground truncate">
              {priceLabel}
            </span>
            {savingsLabel ? (
              <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                {savingsLabel}
              </span>
            ) : savingsPercent != null && savingsPercent > 0 ? (
              <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                -{savingsPercent}%
              </span>
            ) : null}
          </div>
          {secondaryLabel && secondaryHref && (
            <a
              href={secondaryHref}
              className="block truncate text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryLabel}
            </a>
          )}
        </div>

        {/* CTA button */}
        <Link
          href={ctaHref}
          className="flex-shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
