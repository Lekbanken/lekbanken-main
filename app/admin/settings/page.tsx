const settingsAreas = ["Access", "Branding", "Edge-prestanda"];

export default function SettingsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Inställningar</h2>
        <span className="text-xs text-slate-500">Delad navigation</span>
      </header>
      <p className="text-sm text-slate-700">Konfiguration för alla adminmoduler hålls samlad och återanvänder UI från andra sidor.</p>
      <div className="flex gap-2 text-xs text-slate-700">
        {settingsAreas.map((area) => (
          <span key={area} className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
            {area}
          </span>
        ))}
      </div>
    </section>
  );
}
