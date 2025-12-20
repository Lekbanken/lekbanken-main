"use client";

import type { ReactNode } from "react";
import { AppShell as Shell } from "@/components/app/AppShell";
import { AppTopbar } from "./components/app-topbar";
import { ToastProvider } from "@/components/ui/toast";

export default function AppShellContent({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <Shell header={<AppTopbar />}>{children}</Shell>
    </ToastProvider>
  );
}
