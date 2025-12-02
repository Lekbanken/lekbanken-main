"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavItems } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/40 bg-card/98 backdrop-blur-xl lg:hidden"
      role="navigation"
      aria-label="Huvudnavigation"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {appNavItems.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const isPlayTab = tab.href === "/app/play";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className="group flex flex-col items-center justify-center gap-0.5 py-2 active:scale-95 transition-transform duration-100"
            >
              <span
                className={`flex items-center justify-center rounded-2xl transition-all duration-200 ${
                  isPlayTab ? "h-12 w-12" : "h-11 w-11"
                } ${
                  active
                    ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25"
                    : "text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                }`}
              >
                {active ? tab.iconActive : tab.icon}
              </span>
              <span className={`text-[11px] font-medium tracking-wide transition-colors ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
