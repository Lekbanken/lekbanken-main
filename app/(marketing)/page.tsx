const sections = [
  {
    title: "Marketing",
    description:
      "Publik webbplats med klassisk responsiv layout. Byggd för att kommunicera värdet av Lekbanken utan att kopplas till appens navigation.",
  },
  {
    title: "App",
    description:
      "Mobil-first upplevelse för lekledare. Använder bottom navigation och ett luftigt gränssnitt på desktop.",
  },
  {
    title: "Admin",
    description:
      "Desktop-first portal med vänstersidebar och topbar för sök och notiser. Organiserad per modul för tydlighet.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-500">Frontend Architecture</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900">
          Tre UI-världar i Next.js App Router
        </h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Lekbanken separerar Marketing, App och Admin i varsin layout. Arkitekturen undviker
          kodduplikation, gör navigationen unik per värld och behåller globala providers gemensamma.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {sections.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-3 text-sm text-slate-700">{section.description}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-slate-900">
        <h3 className="text-lg font-semibold">Regler</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-800">
          <li>Inga duplicerade folder-namn mellan UI-världarna.</li>
          <li>Varje värld har egen layout och navigation.</li>
          <li>Globala providers delas via rotlayouten.</li>
          <li>Delade komponenter flyttas till /components eller /lib/ui.</li>
        </ul>
      </section>
    </div>
  );
}
