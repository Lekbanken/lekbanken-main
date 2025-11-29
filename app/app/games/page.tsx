const filters = ["Sök", "Åldersfilter", "Längd", "Energinivå"];

export default function GamesPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">GamesScreen</h2>
        <span className="text-xs text-indigo-200">Organism: GamesFilterBar</span>
      </header>
      <p className="text-sm text-slate-200">
        Listar lekar med sök, filter och återanvänder GameCard från komponentbiblioteket.
      </p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-100">
        {filters.map((filter) => (
          <span key={filter} className="rounded-full bg-indigo-500/30 px-3 py-1">
            {filter}
          </span>
        ))}
      </div>
    </section>
  );
}
