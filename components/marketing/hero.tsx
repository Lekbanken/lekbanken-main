import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-primary/5 via-background to-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:flex lg:items-center lg:gap-x-10 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
            Ny plattform för aktiviteter
          </div>
          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Lekbanken gör planeringen lekfull, snabb och delbar.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Bygg, anpassa och dela aktiviteter på sekunder. Perfekt för
            träningar, lektioner och teambuilding.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button size="lg" href="/auth/signup">
              Prova gratis
            </Button>
            <Button size="lg" variant="outline" href="/#contact">
              Boka demo
            </Button>
          </div>
          <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4 text-sm text-muted-foreground">
            {[
              { label: "Aktiviteter", value: "1 240+" },
              { label: "Sparad tid/vecka", value: "-6h" },
              { label: "Delningar", value: "+320%" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/60 bg-card/60 p-3"
              >
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="text-lg font-semibold text-foreground">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mt-12 w-full max-w-xl flex-none lg:mt-0 lg:w-2/5">
          <div
            className="absolute -inset-6 -z-10 rounded-3xl bg-primary/10 blur-3xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-lg shadow-primary/10">
            <div className="aspect-[4/3] rounded-2xl bg-muted text-muted-foreground flex items-center justify-center text-sm">
              UI-preview / skärmdump här
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

