import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "Lekbanken – Gör planeringen lekfull, snabb och delbar",
  description:
    "Bygg, anpassa och dela aktiviteter på sekunder. Perfekt för träningar, lektioner och teambuilding.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
