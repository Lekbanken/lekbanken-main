'use client'

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Funktioner", href: "#features" },
  { name: "Så funkar det", href: "#how-it-works" },
  { name: "Priser", href: "#pricing" },
  { name: "Kunder", href: "#testimonials" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8"
        aria-label="Huvudnavigering"
      >
        <div className="flex lg:flex-1">
          <Link href="/" className="flex items-center gap-2 p-1.5">
            <span className="sr-only">Lekbanken</span>
            <Image
              src="/lekbanken-icon.png"
              alt="Lekbanken ikon"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg"
              priority
            />
            <span className="text-xl font-semibold text-foreground">Lekbanken</span>
          </Link>
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <div className="flex lg:hidden">
            <SheetTrigger asChild>
              <button
                type="button"
                className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Öppna menyn</span>
                <Bars3Icon aria-hidden="true" className="h-6 w-6" />
              </button>
            </SheetTrigger>
          </div>

          <SheetContent side="right" className="w-full border-l border-border px-6 py-4 sm:max-w-sm">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 p-1.5">
                <span className="sr-only">Lekbanken</span>
                <Image
                  src="/lekbanken-icon.png"
                  alt="Lekbanken ikon"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg"
                />
                <span className="text-xl font-semibold text-foreground">Lekbanken</span>
              </Link>
              <SheetClose asChild>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-muted-foreground hover:text-foreground"
                >
                  <span className="sr-only">Stäng menyn</span>
                  <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                </button>
              </SheetClose>
            </div>

            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-border">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-muted"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="space-y-3 py-6">
                  <Button variant="outline" href="/auth/login" className="w-full">
                    Logga in
                  </Button>
                  <Button href="/auth/signup" className="w-full">
                    Prova gratis
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          <Button variant="ghost" href="/auth/login">
            Logga in
          </Button>
          <Button href="/auth/signup">
            Prova gratis
          </Button>
        </div>
      </nav>
    </header>
  );
}
