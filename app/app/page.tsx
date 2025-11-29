const highlights = [
  "Bottom navigation som standard",
  "Delade komponenter i /components/shared",
  "Luftigt desktopläge med centrerat innehåll",
];

export default function AppHome() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
      <h2 className="text-xl font-semibold">AppShell</h2>
      <p className="mt-2 text-sm text-slate-200">
        App-världen är mobil först. Navigeringen ligger i botten och vyerna använder delade byggstenar istället för duplicerade
        layoutar.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-slate-100">
        {highlights.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
