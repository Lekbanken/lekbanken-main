import type { ReactNode } from "react";

type Props = {
  title: string;
  eyebrow?: string;
  rightSlot?: ReactNode;
};

export function PageHeader({ title, eyebrow, rightSlot }: Props) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-background/90 px-4 pb-3 pt-4 backdrop-blur lg:px-8">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="text-xl font-semibold text-foreground lg:text-2xl">{title}</h1>
      </div>
      {rightSlot}
    </header>
  );
}
