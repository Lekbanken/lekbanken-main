import { HomeIcon, SunIcon, UsersIcon, AcademicCapIcon } from "@heroicons/react/24/outline";

type SessionHeaderProps = {
  title: string;
  summary: string;
  meta?: Array<{ label: string; value: string }>;
};

const metaIcons: Record<string, typeof HomeIcon> = {
  "Miljö": SunIcon,
  "Grupp": UsersIcon,
  "Ålder": AcademicCapIcon,
};

export function SessionHeader({ title, summary, meta = [] }: SessionHeaderProps) {
  return (
    <header className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Spela</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{summary}</p>
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {meta.map((item) => {
            const Icon = metaIcons[item.label] || HomeIcon;
            return (
              <span
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs font-medium text-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {item.value}
              </span>
            );
          })}
        </div>
      )}
    </header>
  );
}
