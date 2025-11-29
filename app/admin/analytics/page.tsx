const charts = ["ActivityFeed", "DashboardOverviewCards", "QuickStatsCard"];

export default function AnalyticsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Analys</h2>
        <span className="text-xs text-slate-500">Edge-optimerat</span>
      </header>
      <p className="text-sm text-slate-700">Rapporter och realtidsdata som prioriterar desktopupplevelsen.</p>
      <div className="flex gap-2 text-xs text-slate-700">
        {charts.map((chart) => (
          <span key={chart} className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
            {chart}
          </span>
        ))}
      </div>
    </section>
  );
}
