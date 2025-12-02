import { Button } from "@/components/ui/button";
import type { JSX } from "react";

type Feature = {
  title: string;
  description: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

const FunnelIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LayoutIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
    <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.8" />
    <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
    <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.8" />
  </svg>
);

const ShareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <circle cx="18" cy="5" r="3" strokeWidth="1.8" />
    <circle cx="6" cy="12" r="3" strokeWidth="1.8" />
    <circle cx="18" cy="19" r="3" strokeWidth="1.8" />
    <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" strokeWidth="1.8" />
  </svg>
);

const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M12 3 5 5.5v6.1c0 4.18 3.05 7.94 7 8.9 3.95-.96 7-4.72 7-8.9V5.5L12 3Z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12.5 11 14l4-5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const features: Feature[] = [
  {
    title: "Smarta filter",
    description: "Hitta aktiviteter efter ålder, gruppstorlek, tema och tid.",
    Icon: FunnelIcon,
  },
  {
    title: "Passbyggare",
    description: "Kombinera lek-kort till färdiga pass och spara som mallar.",
    Icon: LayoutIcon,
  },
  {
    title: "Delning & export",
    description: "Skicka pass med länk eller skriv ut kort för offline-läge.",
    Icon: ShareIcon,
  },
  {
    title: "Säkerhet & samtycke",
    description: "Samla säkerhetsnotiser och behörigheter per aktivitet.",
    Icon: ShieldIcon,
  },
];

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="bg-background py-24 sm:py-32"
      aria-labelledby="features-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:items-center sm:text-center">
          <p className="text-sm font-semibold text-primary">Värde för laget</p>
          <div>
            <h2
              id="features-title"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Bygg, anpassa och dela utan friktion.
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
              Lekbanken sparar tid för coacher, lärare och ledare genom tydliga verktyg och
              smidig delning.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-lg"
            >
              <div className="space-y-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-[#00c7b0]/10 transition-transform group-hover:scale-110">
                  <feature.Icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-4 py-1.5 font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">
            Login + SSO
          </span>
          <span className="rounded-full bg-muted px-4 py-1.5 font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">
            Delade mappar
          </span>
          <span className="rounded-full bg-muted px-4 py-1.5 font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">
            PDF & utskrift
          </span>
          <span className="rounded-full bg-muted px-4 py-1.5 font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary">
            Återanvändbara mallar
          </span>
          <Button size="sm" variant="ghost" href="/auth/login" className="font-medium">
            Logga in →
          </Button>
        </div>
      </div>
    </section>
  );
}
