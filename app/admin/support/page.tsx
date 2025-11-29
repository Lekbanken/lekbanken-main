const tools = ["ConfirmDialog", "Toast", "Modal"];

export default function SupportPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Support</h2>
        <span className="text-xs text-slate-500">Shared utilities</span>
      </header>
      <p className="text-sm text-slate-700">Supportflöden återanvänder delade modaler och notiser för konsekvent UX.</p>
      <div className="flex gap-2 text-xs text-slate-700">
        {tools.map((tool) => (
          <span key={tool} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
            {tool}
          </span>
        ))}
      </div>
    </section>
  );
}
