import type { ReactNode } from "react";

type SettingsListProps = {
  title?: string;
  children: ReactNode;
};

export function SettingsList({ title, children }: SettingsListProps) {
  return (
    <section className="space-y-2">
      {title && (
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
        {children}
      </div>
    </section>
  );
}
