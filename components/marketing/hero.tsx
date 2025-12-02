import { Button } from "@/components/ui/button";

const stats = [
  { label: "Aktiviteter", value: "1 240+", icon: "📚" },
  { label: "Sparad tid/vecka", value: "-6h", icon: "⏱️" },
  { label: "Delningar", value: "+320%", icon: "📤" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-primary/5 via-primary/[0.02] to-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:flex lg:items-center lg:gap-x-10 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/15">
            Ny plattform för aktiviteter
          </div>
          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Lekbanken gör planeringen{" "}
            <span className="bg-gradient-to-r from-primary via-[#00c7b0] to-primary bg-clip-text text-transparent">
              lekfull
            </span>
            , snabb och delbar.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Bygg, anpassa och dela aktiviteter på sekunder. Perfekt för träningar, lektioner och
            teambuilding.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button 
              size="lg" 
              href="/auth/signup"
              className="shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02]"
            >
              Prova gratis
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              href="#cta"
              className="transition-all duration-200 hover:scale-[1.02] hover:border-primary/50"
            >
              Boka demo
            </Button>
          </div>
          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 text-sm text-muted-foreground">
            {stats.map((item) => (
              <div
                key={item.label}
                className="group rounded-xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-1 text-lg" aria-hidden>{item.icon}</div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </dt>
                <dd className="text-xl font-bold text-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mt-12 w-full max-w-xl flex-none lg:mt-0 lg:w-2/5">
          {/* Animated gradient blob */}
          <div
            className="absolute -inset-6 -z-10 animate-pulse rounded-3xl bg-gradient-to-br from-primary/20 via-[#00c7b0]/10 to-[#ffd166]/10 blur-3xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/10">
            {/* Floating cards mockup */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-muted/50">
              {/* Card 1 - Back */}
              <div className="absolute left-4 top-4 h-24 w-40 rotate-[-6deg] rounded-xl border border-border bg-card p-3 shadow-lg transition-transform hover:rotate-[-3deg]">
                <div className="h-2 w-16 rounded bg-primary/60" />
                <div className="mt-2 h-2 w-24 rounded bg-muted-foreground/20" />
                <div className="mt-1 h-2 w-20 rounded bg-muted-foreground/20" />
                <div className="mt-3 flex gap-1">
                  <div className="h-4 w-4 rounded bg-[#00c7b0]/40" />
                  <div className="h-4 w-4 rounded bg-[#ffd166]/40" />
                </div>
              </div>
              {/* Card 2 - Middle */}
              <div className="absolute right-8 top-12 h-28 w-44 rotate-[3deg] rounded-xl border border-border bg-card p-3 shadow-xl transition-transform hover:rotate-[6deg]">
                <div className="h-2.5 w-20 rounded bg-[#00c7b0]" />
                <div className="mt-2 h-2 w-32 rounded bg-muted-foreground/20" />
                <div className="mt-1 h-2 w-28 rounded bg-muted-foreground/20" />
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-primary/30" />
                  <div className="h-2 w-16 rounded bg-muted-foreground/20" />
                </div>
              </div>
              {/* Card 3 - Front */}
              <div className="absolute bottom-6 left-1/2 h-32 w-48 -translate-x-1/2 rotate-[-2deg] rounded-xl border-2 border-primary/30 bg-card p-4 shadow-2xl transition-transform hover:scale-105">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary/80" />
                  <div className="h-3 w-24 rounded bg-foreground/80" />
                </div>
                <div className="mt-3 h-2 w-full rounded bg-muted-foreground/20" />
                <div className="mt-1 h-2 w-3/4 rounded bg-muted-foreground/20" />
                <div className="mt-4 flex gap-2">
                  <div className="h-6 w-16 rounded-full bg-primary text-[8px] font-medium text-primary-foreground flex items-center justify-center">Planera</div>
                  <div className="h-6 w-14 rounded-full bg-muted text-[8px] font-medium text-muted-foreground flex items-center justify-center">6-12 år</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
