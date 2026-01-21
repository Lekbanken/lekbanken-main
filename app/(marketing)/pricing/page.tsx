"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

const tiers = [
  {
    nameKey: "tiers.marketing.name",
    priceKey: "tiers.marketing.price",
    descriptionKey: "tiers.marketing.description",
    highlightKey: "tiers.marketing.highlight",
  },
  {
    nameKey: "tiers.app.name",
    priceKey: "tiers.app.price",
    descriptionKey: "tiers.app.description",
    highlightKey: "tiers.app.highlight",
  },
  {
    nameKey: "tiers.admin.name",
    priceKey: "tiers.admin.price",
    descriptionKey: "tiers.admin.description",
    highlightKey: "tiers.admin.highlight",
  },
];

type PricingApiProduct = {
  id: string;
  name: string;
  description: string | null;
  product_key: string | null;
  product_type: string | null;
  category: string | null;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    interval: string | null;
    interval_count: number | null;
    is_default: boolean;
  }>;
};

type PricingApiResponse = {
  currency: string;
  products: PricingApiProduct[];
};

export default function PricingPage() {
  const t = useTranslations("marketing.pricing");
  const [pricing, setPricing] = useState<PricingApiResponse | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/public/pricing?currency=SEK", {
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error(`pricing api failed: ${res.status}`);
        const json = (await res.json()) as PricingApiResponse;
        if (!active) return;
        setPricing(json);
      } catch (err) {
        if (!active) return;
        setPricingError(err instanceof Error ? err.message : "Failed to load pricing");
        setPricing(null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const productCards = useMemo(() => {
    const products = pricing?.products ?? [];
    if (products.length === 0) return null;

    return products.map((p) => {
      const defaultPrice = p.prices.find((pr) => pr.is_default) ?? p.prices[0] ?? null;
      const priceLabel = defaultPrice
        ? `${Math.round(defaultPrice.amount / 100)} ${defaultPrice.currency}` +
          (defaultPrice.interval ? `/${defaultPrice.interval}` : "")
        : "";

      return {
        key: p.id,
        name: p.name,
        highlight: p.product_key ?? p.product_type ?? "",
        price: priceLabel,
        description: p.description ?? "",
      };
    });
  }, [pricing]);

  const fallbackCards = tiers.map((tier) => ({
    key: tier.nameKey,
    name: t(tier.nameKey as Parameters<typeof t>[0]),
    highlight: t(tier.highlightKey as Parameters<typeof t>[0]),
    price: t(tier.priceKey as Parameters<typeof t>[0]),
    description: t(tier.descriptionKey as Parameters<typeof t>[0]),
  }));

  const cards = productCards ?? fallbackCards;
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{t("badge")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-slate-700">{t("description")}</p>
        {pricingError ? (
          <p className="text-xs text-slate-500">{pricingError}</p>
        ) : null}
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.key}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{card.name}</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {card.highlight}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.price}</p>
            <p className="mt-3 text-sm text-slate-700">{card.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
