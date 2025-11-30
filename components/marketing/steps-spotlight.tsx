type SpotlightFeature = {
  name: string;
  description: string;
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
};

const ShieldIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      d="M12 3 5 5.5v6.1c0 4.18 3.05 7.94 7 8.9 3.95-.96 7-4.72 7-8.9V5.5L12 3Z"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 12.5 11 14l4-5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path d="M12 16V4" strokeWidth="1.6" strokeLinecap="round" />
    <path d="m7 9 5-5 5 5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ServerIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <rect x="3.5" y="4" width="17" height="5.5" rx="1.5" strokeWidth="1.6" />
    <rect x="3.5" y="14.5" width="17" height="5.5" rx="1.5" strokeWidth="1.6" />
    <circle cx="7" cy="6.75" r="0.7" fill="currentColor" />
    <circle cx="7" cy="17.25" r="0.7" fill="currentColor" />
    <path d="M10 7h7M10 17h7" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const features: SpotlightFeature[] = [
  {
    name: "Snabb publicering",
    description: "Spara, duplicera och publicera pass med ett klick.",
    Icon: UploadIcon,
  },
  {
    name: "Säkra samtycken",
    description: "Behörigheter och notiser samlade per pass/aktivitet.",
    Icon: ShieldIcon,
  },
  {
    name: "Backup & export",
    description: "Exportera till PDF/print och ha allt i trygg backup.",
    Icon: ServerIcon,
  },
];

export function StepsSpotlight() {
  return (
    <section
      id="spotlight"
      className="bg-background py-20"
      aria-labelledby="spotlight-title"
    >
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-card px-6 py-16 ring-1 ring-border sm:px-10 lg:py-20 xl:px-20">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-12 gap-y-12 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
            <div className="lg:max-w-md">
              <p className="text-sm font-semibold text-primary">För teamet</p>
              <h2
                id="spotlight-title"
                className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
              >
                Boostad produktivitet för ledare och lärare.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Planera, anpassa och dela med trygghet. Allt sparas och kan återanvändas,
                så du slipper börja om.
              </p>
            </div>

            <div className="order-first lg:order-none">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
                <div className="aspect-[16/10] w-full flex items-center justify-center text-sm text-muted-foreground">
                  Produktbild / skärmdump här
                </div>
              </div>
            </div>

            <div className="lg:row-start-2 lg:max-w-md lg:border-t lg:border-border lg:pt-8">
              <dl className="space-y-6 text-sm text-muted-foreground">
                {features.map(({ name, description, Icon }) => (
                  <div key={name} className="relative pl-10">
                    <Icon className="absolute left-0 top-1 h-5 w-5 text-primary" aria-hidden />
                    <dt className="font-semibold text-foreground">{name}</dt>
                    <dd className="mt-1">{description}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-12 -z-10 -translate-y-1/2 blur-3xl lg:-bottom-40 lg:left-1/4 lg:top-auto lg:translate-y-0"
          >
            <div className="aspect-[1155/678] w-[280px] bg-gradient-to-tr from-primary/30 to-foreground/10 opacity-25" />
          </div>
        </div>
      </div>
    </section>
  );
}
import type React from "react";
