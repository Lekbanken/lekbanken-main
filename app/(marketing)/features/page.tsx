import { useTranslations } from "next-intl";

const featureGroups = [
  {
    titleKey: "groups.sharedProviders.title",
    pointsKeys: [
      "groups.sharedProviders.points.theme",
      "groups.sharedProviders.points.layouts",
    ],
  },
  {
    titleKey: "groups.uiWorlds.title",
    pointsKeys: [
      "groups.uiWorlds.points.marketing",
      "groups.uiWorlds.points.app",
      "groups.uiWorlds.points.admin",
    ],
  },
  {
    titleKey: "groups.responsiveStrategy.title",
    pointsKeys: [
      "groups.responsiveStrategy.points.marketing",
      "groups.responsiveStrategy.points.app",
      "groups.responsiveStrategy.points.admin",
    ],
  },
];

export default function FeaturesPage() {
  const t = useTranslations("marketing.features");
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">{t("badge")}</p>
        <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-slate-700">{t("description")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {featureGroups.map((group) => (
          <article key={group.titleKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t(group.titleKey as Parameters<typeof t>[0])}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {group.pointsKeys.map((pointKey) => (
                <li key={pointKey} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" aria-hidden />
                  <span>{t(pointKey as Parameters<typeof t>[0])}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
