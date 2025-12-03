'use client';

import type { ReactNode } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLayoutContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
