import type { Metadata } from "next";
import type { ReactNode } from "react";
import MarketingLayoutContent from "./layout-client";

export const metadata: Metadata = {
  title: "Lekbanken - Gör planeringen lekfull, snabb och delbar",
  description:
    "Bygg, anpassa och dela aktiviteter på sekunder. Perfekt för träningar, lektioner och teambuilding.",
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <MarketingLayoutContent>{children}</MarketingLayoutContent>;
}
