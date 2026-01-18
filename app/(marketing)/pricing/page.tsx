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

export default function PricingPage() {
  const t = useTranslations("marketing.pricing");
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{t("badge")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-slate-700">{t("description")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.nameKey}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t(tier.nameKey as Parameters<typeof t>[0])}</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {t(tier.highlightKey as Parameters<typeof t>[0])}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{t(tier.priceKey as Parameters<typeof t>[0])}</p>
            <p className="mt-3 text-sm text-slate-700">{t(tier.descriptionKey as Parameters<typeof t>[0])}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
