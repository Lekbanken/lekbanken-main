const columns = ["Användare", "Roll", "Status"];

export default function UsersPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Användare</h2>
        <span className="text-xs text-slate-500">TableHeader + Filters</span>
      </header>
      <p className="text-sm text-slate-700">Användarlistor delar samma tabellkomponenter som andra adminmoduler.</p>
      <div className="flex gap-2 text-xs text-slate-700">
        {columns.map((column) => (
          <span key={column} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
            {column}
          </span>
        ))}
      </div>
    </section>
  );
}
