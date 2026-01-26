'use client';

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Footer } from "@/components/marketing/footer";

// Dynamic import with SSR disabled to prevent hydration mismatch from Radix UI IDs
const Header = dynamic(
  () => import("@/components/marketing/header").then(mod => ({ default: mod.Header })),
  { ssr: false }
);

export default function MarketingLayoutContent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
