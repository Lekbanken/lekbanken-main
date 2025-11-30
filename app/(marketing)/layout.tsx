import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarketingFooter } from "./components/marketing-footer";
import { MarketingHeader } from "./components/marketing-header";

export const metadata: Metadata = {
  title: "Lekbanken – Marketing",
  description: "Publik webbplats för Lekbanken med marknads- och onboardingflöden.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12 sm:py-16 lg:px-8">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
