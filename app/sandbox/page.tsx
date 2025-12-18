'use client'

import { notFound } from "next/navigation";
import { SandboxShell } from "./components/shell/SandboxShellV2";
import { CategorySection } from "./components/CategorySection";
import { getCategoryById } from "./config/sandbox-modules";

if (process.env.NODE_ENV === "production") {
  notFound();
}

export default function SandboxIndex() {
  // Get categories in display order
  const docs = getCategoryById('docs');
  const designSystem = getCategoryById('design-system');
  const app = getCategoryById('app');
  const admin = getCategoryById('admin');
  const marketing = getCategoryById('marketing');
  const primitives = getCategoryById('primitives');

  return (
    <SandboxShell
      moduleId=""
      title="UI Sandbox"
      description="Testa och utveckla komponenter isolerat."
    >
      <div className="space-y-8">
        {/* Docs & Wiki */}
        {docs && (
          <CategorySection category={docs} />
        )}

        {/* Design System - Show first 5 modules */}
        {designSystem && (
          <CategorySection category={designSystem} maxModules={5} />
        )}

        {/* App Sandbox - Show first 4 modules */}
        {app && (
          <CategorySection category={app} maxModules={4} />
        )}

        {/* Admin Sandbox - Show first 4 modules */}
        {admin && (
          <CategorySection category={admin} maxModules={4} />
        )}

        {/* Marketing - Show all 4 modules */}
        {marketing && (
          <CategorySection category={marketing} />
        )}

        {/* UI Primitives - Show all modules */}
        {primitives && (
          <CategorySection category={primitives} />
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Sandbox är endast synlig i development mode.</p>
        </div>
      </div>
    </SandboxShell>
  );
}
