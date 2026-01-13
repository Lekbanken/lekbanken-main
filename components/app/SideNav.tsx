"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { appNavItems } from "./nav-items";

export function SideNav() {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border/50 bg-card/98 px-4 py-6 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 px-2 pb-6">
        <Image
          src="/lekbanken-icon.png"
          alt="Lekbanken ikon"
          width={36}
          height={36}
          className="h-9 w-9 rounded-xl bg-primary/5 p-1"
        />
        <div>
          <Link href="/app" className="text-lg font-semibold tracking-tight text-foreground">
            Lekbanken
          </Link>
          <p className="text-xs font-medium text-primary">App</p>
        </div>
      </div>
      <nav className="mt-6 space-y-1" aria-label="Sidnavigation">
        {appNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:scale-[1.01] ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary shadow-sm shadow-primary/50" />
              )}
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                active ? "bg-primary/15 text-primary" : "bg-muted/60 text-inherit group-hover:bg-muted"
              }`}>
                {active ? item.iconActive : item.icon}
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/70 px-4 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-semibold text-foreground">{t('app.nav.tip')}</p>
        </div>
        <p className="mt-2 leading-relaxed">
          {t('app.nav.tipText')}
        </p>
      </div>
    </aside>
  );
}
