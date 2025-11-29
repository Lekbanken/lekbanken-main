export function AdminTopbar() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-6 py-4 backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">AdminShell</p>
        <h1 className="text-xl font-semibold text-slate-900">Modulbaserad navigation</h1>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <span>Sök & notifications</span>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Desktop-first</span>
      </div>
    </header>
  );
}
