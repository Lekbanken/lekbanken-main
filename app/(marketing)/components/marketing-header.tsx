'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "#how-it-works", label: "Så funkar det" },
  { href: "#spotlight", label: "Produkt" },
  { href: "#testimonials", label: "Kunder" },
  { href: "#pricing", label: "Priser" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          Lekbanken
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-2 py-1 transition hover:text-foreground hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="ghost" href="/auth/login" size="sm">
            Logga in
          </Button>
          <Button size="sm" href="/auth/signup">
            Prova gratis
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-muted lg:hidden"
          aria-label="Öppna menyn"
        >
          <span className="sr-only">Öppna menyn</span>
          <svg viewBox="0 0 24 24" className="h-6 w-6" stroke="currentColor" fill="none" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="fixed inset-y-0 right-0 z-40 w-full max-w-sm overflow-y-auto border-l border-border bg-background px-6 py-8 shadow-xl">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg font-semibold text-foreground" onClick={() => setOpen(false)}>
                Lekbanken
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-foreground hover:bg-muted"
                aria-label="Stäng menyn"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" stroke="currentColor" fill="none" strokeWidth="1.8">
                  <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="mt-8 space-y-3 text-base font-semibold text-foreground">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2 hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button variant="outline" href="/auth/login">
                Logga in
              </Button>
              <Button href="/auth/signup">Prova gratis</Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
