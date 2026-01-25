'use client'

import { useTranslations } from 'next-intl';
import { useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";

type Frequency = "monthly" | "annually";

const frequencyKeys = ['monthly', 'annually'] as const;

const tierKeys = ['free', 'pro', 'team'] as const;
const tierConfig = [
  { id: 'tier-free', featured: false, href: '/auth/signup', hasPrice: true },
  { id: 'tier-pro', featured: false, href: '/auth/signup', hasPrice: true },
  { id: 'tier-team', featured: true, href: '#cta', hasPrice: false },
] as const;

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="m5 13 4 4 10-10" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PricingSection() {
  const t = useTranslations('marketing');
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  return (
    <section
      id="pricing"
      className="bg-background py-20 sm:py-28"
      aria-labelledby="pricing-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-primary">{t('pricing.tagline')}</p>
        <h2
          id="pricing-title"
          className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          {t('pricing.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          {t('pricing.description')}
        </p>

        <div className="mt-10 flex items-center justify-center gap-3">
          <fieldset aria-label={t('pricing.frequencyLabel')}>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-muted/70 p-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
              {frequencyKeys.map((key) => (
                <label
                  key={key}
                  className={cx(
                    "relative cursor-pointer rounded-full px-3 py-1.5 transition-colors",
                    frequency === key && "bg-primary text-primary-foreground shadow-sm",
                  )}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={key}
                    checked={frequency === key}
                    onChange={() => setFrequency(key)}
                    className="sr-only"
                  />
                  {t(`pricing.frequencies.${key}.label`)}
                </label>
              ))}
            </div>
          </fieldset>
          {frequency === "annually" && (
            <span className="animate-in fade-in slide-in-from-left-2 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {t('pricing.save15')}
            </span>
          )}
        </div>

        <div className="isolate mx-auto mt-12 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tierKeys.map((tierKey, index) => {
            const config = tierConfig[index];
            const isFeatured = config.featured;
            const price = config.hasPrice
              ? t(`pricing.tiers.${tierKey}.price.${frequency}`)
              : t(`pricing.tiers.${tierKey}.price`);
            const features = t.raw(`pricing.tiers.${tierKey}.features`) as string[];

            return (
              <div
                key={config.id}
                className={cx(
                  "relative rounded-3xl p-8 ring-1 ring-border shadow-sm text-left xl:p-10 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
                  isFeatured && "border-primary ring-primary bg-primary/5 scale-[1.02]",
                )}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {t('pricing.mostPopular')}
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">{t(`pricing.tiers.${tierKey}.name`)}</h3>
                <p className="mt-3 text-sm text-foreground/70">{t(`pricing.tiers.${tierKey}.description`)}</p>
                <p className="mt-6 flex items-baseline gap-1 text-4xl font-semibold text-foreground">
                  {price}
                  {config.hasPrice && (
                    <span className="text-sm font-semibold text-foreground/70">
                      {t(`pricing.frequencies.${frequency}.suffix`)}
                    </span>
                  )}
                </p>

                <Button
                  className={cx("mt-6 w-full transition-all", isFeatured && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30")}
                  variant={isFeatured ? "default" : "outline"}
                  href={config.href}
                >
                  {t(`pricing.tiers.${tierKey}.cta`)}
                </Button>

                <ul className="mt-8 space-y-3 text-sm text-foreground/70 xl:mt-10">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <CheckIcon
                        aria-hidden="true"
                        className={cx("h-5 w-5 flex-none", isFeatured ? "text-foreground" : "text-primary")}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
