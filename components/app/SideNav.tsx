"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavItems } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/80 bg-card/95 px-4 py-6 backdrop-blur lg:flex lg:flex-col">
      <div className="px-2">
        <Link href="/app" className="text-lg font-semibold tracking-tight text-foreground">
          Lekbanken
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">App</p>
      </div>
      <nav className="mt-6 space-y-1" aria-label="Sidnavigation">
        {appNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/70 text-inherit">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-border bg-muted/60 px-3 py-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">Tips</p>
        <p className="mt-1">
          Lägg till dina mest använda filter som snabbval så går planeringen ännu snabbare.
        </p>
      </div>
    </aside>
  );
}
