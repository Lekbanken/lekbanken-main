'use client';

import type { ReactNode } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
import { AuthProvider } from "@/lib/supabase/auth";

export default function MarketingLayoutContent({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
