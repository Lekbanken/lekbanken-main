'use client';

import { useTranslations } from 'next-intl';
import { HomeIcon, SunIcon, UsersIcon, AcademicCapIcon, ClockIcon, Squares2X2Icon } from "@heroicons/react/24/outline";

type MetaItem = {
  /** Key used for icon lookup (e.g., 'environment', 'group', 'age') */
  key: string;
  /** Translated label to display */
  label: string;
  /** Value to display */
  value: string;
};

type SessionHeaderProps = {
  title: string;
  summary: string;
  meta?: MetaItem[];
};

const metaIcons: Record<string, typeof HomeIcon> = {
  environment: SunIcon,
  group: UsersIcon,
  age: AcademicCapIcon,
  duration: ClockIcon,
  blocks: Squares2X2Icon,
};

export function SessionHeader({ title, summary, meta = [] }: SessionHeaderProps) {
  const t = useTranslations('play');
  return (
    <header className="space-y-3">
      <div className="space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">{t('play')}</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{summary}</p>
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {meta.map((item) => {
            const Icon = metaIcons[item.key] || HomeIcon;
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
