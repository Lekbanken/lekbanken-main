const featureGroups = [
  {
    title: "Delade providers",
    points: [
      "Tema, Supabase och i18n laddas i rotlayouten.",
      "Layoutarna är tunna och fokuserar på navigation och chrome.",
    ],
  },
  {
    title: "UI-världar",
    points: [
      "Marketing använder header och footer utan koppling till appflöden.",
      "App har bottom navigation och mobilanpassade komponenter.",
      "Admin har vänstersidebar och topbar med sök/notifications.",
    ],
  },
  {
    title: "Responsiv strategi",
    points: [
      "Marketing: klassisk responsiv layout.",
      "App: mobil först med luftigt desktopläge.",
      "Admin: desktop först med fallback för mindre skärmar.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">Features</p>
        <h1 className="text-3xl font-semibold text-slate-900">Arkitekturen i korthet</h1>
        <p className="max-w-2xl text-sm text-slate-700">
          UI-världarna hålls åtskilda men delar komponentbibliotek. Strukturen i app/ följer Next.js App Router med route groups
          för marketing, app och admin.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {featureGroups.map((group) => (
          <article key={group.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {group.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
