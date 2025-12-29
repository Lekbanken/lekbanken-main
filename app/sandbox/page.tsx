'use client'

import { notFound } from "next/navigation";
import { SandboxShell } from "./components/shell/SandboxShellV2";
import { CategorySection } from "./components/CategorySection";
import { sandboxCategories } from "./config/sandbox-modules";

if (process.env.NODE_ENV === "production") {
  notFound();
}

export default function SandboxIndex() {
  return (
    <SandboxShell
      moduleId=""
      title="UI Sandbox"
      description="Testa och utveckla komponenter isolerat."
    >
      <div className="space-y-8">
        {sandboxCategories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}

        <div className="text-center text-sm text-muted-foreground">
          <p>Sandbox är endast synlig i development mode.</p>
        </div>
      </div>
    </SandboxShell>
  );
}
