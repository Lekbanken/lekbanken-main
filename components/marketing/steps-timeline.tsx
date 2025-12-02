const steps = [
  {
    title: "Planera",
    description: "Välj lek/övning efter ålder, mål och tidsåtgång. Spara som mall.",
    num: 1,
    icon: "📋",
  },
  {
    title: "Anpassa",
    description: "Justera regler, material och nivå. Lägg till säkerhetsnotiser.",
    num: 2,
    icon: "✏️",
  },
  {
    title: "Dela & kör",
    description: "Skicka passet till kollegor/föräldrar eller skriv ut kort.",
    num: 3,
    icon: "📤",
  },
  {
    title: "Följ upp",
    description: "Samla feedback och betyg direkt i Lekbanken och förbättra snabbt.",
    num: 4,
    icon: "📊",
  },
];

export function StepsTimeline() {
  return (
    <section
      id="how-it-works"
      className="bg-muted/30 py-24 sm:py-32"
      aria-labelledby="how-it-works-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Så funkar det</p>
          <h2
            id="how-it-works-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-foreground"
          >
            Från idé till genomfört pass på minuter.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            En enkel tidslinje med fyra moment som du kan upprepa för varje tillfälle.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <div
              key={step.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  aria-hidden="true"
                  className="absolute right-0 top-10 hidden h-0.5 w-8 translate-x-full bg-gradient-to-r from-primary/50 to-primary/20 lg:block"
                />
              )}
              
              {/* Step number */}
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
                  {step.num}
                </span>
                <span className="text-xl" aria-hidden>{step.icon}</span>
              </div>
              
              <p className="text-lg font-semibold text-foreground">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
