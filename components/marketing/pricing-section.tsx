'use client'

import { useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";

type Frequency = "monthly" | "annually";

const frequencies: Array<{ value: Frequency; label: string; priceSuffix: string }> = [
  { value: "monthly", label: "Månadsvis", priceSuffix: "/månad" },
  { value: "annually", label: "Årsvis", priceSuffix: "/år" },
];

const tiers = [
  {
    name: "Gratis",
    id: "tier-free",
    price: { monthly: "0 kr", annually: "0 kr" },
    description: "Testa grunderna för enskilda ledare/lärare.",
    features: ["50 aktiviteter", "Grundläggande filter", "Delning via länk", "1 användare"],
    featured: false,
    cta: "Kom igång",
  },
  {
    name: "Pro",
    id: "tier-pro",
    price: { monthly: "149 kr", annually: "1 490 kr" },
    description: "För aktiva coacher/skolor som planerar löpande.",
    features: [
      "Obegränsade aktiviteter",
      "Passbibliotek & mallar",
      "Kommentarer & feedback",
      "Export/skriv ut",
    ],
    featured: false,
    cta: "Starta Pro",
  },
  {
    name: "Team",
    id: "tier-team",
    price: "Kontakta oss",
    description: "För föreningar och arbetslag som samarbetar.",
    features: [
      "Allt i Pro",
      "Roller & behörigheter",
      "Delade mappar",
      "Support & onboarding",
      "Säkerhetsnotiser & samtycken",
    ],
    featured: true,
    cta: "Boka demo",
  },
];

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="m5 13 4 4 10-10" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PricingSection() {
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  return (
    <section
      id="pricing"
      className="bg-background py-20 sm:py-28"
      aria-labelledby="pricing-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-primary">Priser</p>
        <h2
          id="pricing-title"
          className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
        >
          Priser som växer med din verksamhet.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Välj planen som passar ditt lag – uppgradera när ni växer.
        </p>

        <div className="mt-10 flex justify-center">
          <fieldset aria-label="Betalningsfrekvens">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-muted/70 p-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
              {frequencies.map((option) => (
                <label
                  key={option.value}
                  className={cx(
                    "relative cursor-pointer rounded-full px-3 py-1 transition-colors",
                    frequency === option.value && "bg-primary text-primary-foreground",
                  )}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={frequency === option.value}
                    onChange={() => setFrequency(option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="isolate mx-auto mt-12 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier) => {
            const isFeatured = tier.featured;
            const price =
              typeof tier.price === "string"
                ? tier.price
                : frequency === "monthly"
                  ? tier.price.monthly
                  : tier.price.annually;

            return (
              <div
                key={tier.id}
                className={cx(
                  "rounded-3xl p-8 ring-1 ring-border shadow-sm text-left xl:p-10",
                  isFeatured && "border-primary ring-primary bg-primary/5",
                )}
              >
                <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-1 text-4xl font-semibold text-foreground">
                  {price}
                  {typeof tier.price !== "string" && (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {frequencies.find((f) => f.value === frequency)?.priceSuffix}
                    </span>
                  )}
                </p>

                <Button className="mt-6 w-full" variant={isFeatured ? "default" : "outline"}>
                  {tier.cta}
                </Button>

                <ul className="mt-8 space-y-3 text-sm text-muted-foreground xl:mt-10">
                  {tier.features.map((feature) => (
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
