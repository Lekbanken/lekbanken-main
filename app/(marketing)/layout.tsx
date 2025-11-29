import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarketingFooter } from "./components/marketing-footer";
import { MarketingHeader } from "./components/marketing-header";

export const metadata: Metadata = {
  title: "Lekbanken – Marketing",
  description: "Publik webbplats för Lekbanken med marketing-flöden.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      <MarketingHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-12 sm:py-16">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
