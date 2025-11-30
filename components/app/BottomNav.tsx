"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur lg:hidden"
      role="navigation"
      aria-label="Huvudnavigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {appNavItems.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-[13px] font-medium"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.icon}
              </span>
              <span className={active ? "text-primary" : "text-muted-foreground"}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
