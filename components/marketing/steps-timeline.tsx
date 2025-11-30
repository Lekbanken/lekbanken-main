const steps = [
  {
    title: "Planera",
    description: "Välj lek/övning efter ålder, mål och tidsåtgång. Spara som mall.",
    meta: "Steg 1",
  },
  {
    title: "Anpassa",
    description: "Justera regler, material och nivå. Lägg till säkerhetsnotiser.",
    meta: "Steg 2",
  },
  {
    title: "Dela & kör",
    description: "Skicka passet till kollegor/föräldrar, eller skriv ut som kort.",
    meta: "Steg 3",
  },
  {
    title: "Följ upp",
    description: "Samla feedback och betyg direkt i Lekbanken och förbättra snabbt.",
    meta: "Steg 4",
  },
];

export function StepsTimeline() {
  return (
    <section
      id="how-it-works"
      className="bg-background py-20 sm:py-28"
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

        <div className="mt-10 grid gap-8 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center text-sm font-semibold text-primary">
                <span className="mr-3 h-2 w-2 rounded-full bg-primary" aria-hidden />
                {step.meta}
                <div
                  aria-hidden="true"
                  className="absolute -ml-2 h-px w-screen -translate-x-full bg-border/70 lg:static lg:-mr-6 lg:ml-8 lg:w-auto lg:translate-x-0"
                />
              </div>
              <p className="mt-4 text-lg font-semibold text-foreground">{step.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
