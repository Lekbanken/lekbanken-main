const organisationsColumns = ["Namn", "Plan", "Status"];

export default function OrganisationsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Organisationer</h2>
        <span className="text-xs text-slate-500">DataTable + TagChip</span>
      </header>
      <p className="text-sm text-slate-700">Hantera organisationer, licenser och status direkt i admin.</p>
      <div className="flex gap-2 text-xs text-slate-700">
        {organisationsColumns.map((column) => (
          <span key={column} className="rounded-full bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
            {column}
          </span>
        ))}
      </div>
    </section>
  );
}
