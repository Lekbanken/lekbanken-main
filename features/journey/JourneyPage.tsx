import { PageHeader } from "@/components/app/PageHeader";

const sessions = [
  { title: "Onsdagsträning U12", count: 3, status: "Planerat", time: "Imorgon 18:00" },
  { title: "Skolidrott åk5", count: 4, status: "Utkast", time: "Fre 10:00" },
  { title: "Fritidsgruppen", count: 2, status: "Klart", time: "Igår 15:00" },
];

export function JourneyPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Din lekresa" />
      <div className="space-y-3 px-4 pb-6 lg:px-8">
        {sessions.map((s) => (
          <div key={s.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.count} aktiviteter</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{s.status}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{s.time}</p>
            <div className="mt-3 flex gap-2 text-sm">
              <button className="rounded-lg border border-border bg-muted px-3 py-2 text-foreground">Visa</button>
              <button className="rounded-lg bg-primary px-3 py-2 text-primary-foreground">Starta</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
