const licenseBadges = ["Aktiv", "Pågående", "Avslutad"];

export default function LicensesPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Licenser</h2>
        <span className="text-xs text-slate-500">StatusBadge + Pagination</span>
      </header>
      <p className="text-sm text-slate-700">Licenser kopplas till organisationer och följer samma datatabellsmönster.</p>
      <div className="flex gap-2 text-xs text-slate-700">
        {licenseBadges.map((badge) => (
          <span key={badge} className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}
