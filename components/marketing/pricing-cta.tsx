"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@heroicons/react/24/outline";

/**
 * Minimal pricing CTA band for the homepage.
 * Replaces the old free/pro/team PricingSection with a single
 * call-to-action pointing users to the full /pricing catalog.
 */
export function PricingCta() {
  const t = useTranslations("marketing");

  return (
    <section
      id="pricing"
      className="bg-background py-16 sm:py-20"
      aria-labelledby="pricing-cta-title"
    >
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2
          id="pricing-cta-title"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {t("pricingCta.title")}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          {t("pricingCta.description")}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            {t("pricingCta.cta")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
