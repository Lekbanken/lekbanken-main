const tiers = [
  {
    name: "Marketing",
    price: "0 kr",
    description: "Landningssidor och marknadsföring utan inloggning.",
    highlight: "Publik",
  },
  {
    name: "App",
    price: "Pro per lekledare",
    description: "Mobil-first flöden med bottom navigation och delade komponenter.",
    highlight: "Mobil först",
  },
  {
    name: "Admin",
    price: "Offer",
    description: "Adminportal med desktopprioritet, sidebar och modulbaserad navigering.",
    highlight: "Desktop först",
  },
];

export default function PricingPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Pricing</p>
        <h1 className="text-3xl font-semibold text-slate-900">Tre produktupplevelser</h1>
        <p className="max-w-2xl text-sm text-slate-700">
          Arkitekturen separerar publik marketing, mobil App och desktop Admin för att varje team ska kunna utveckla i sin egen takt.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{tier.name}</h2>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                {tier.highlight}
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{tier.price}</p>
            <p className="mt-3 text-sm text-slate-700">{tier.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
