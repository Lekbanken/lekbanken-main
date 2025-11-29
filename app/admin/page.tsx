const dashboardHighlights = [
  "DashboardOverviewCards visar status", 
  "QuickStatsCard för nyckeltal", 
  "ActivityFeed håller admin uppdaterad"
];

export default function AdminDashboard() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Dashboard</p>
          <h2 className="text-xl font-semibold text-slate-900">Översikt</h2>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Organism: DashboardOverviewCards</span>
      </header>
      <ul className="space-y-2 text-sm text-slate-700">
        {dashboardHighlights.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
