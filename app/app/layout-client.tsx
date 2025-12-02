"use client";

import type { ReactNode } from "react";
import { AppShell as Shell } from "@/components/app/AppShell";
import { AppTopbar } from "./components/app-topbar";

export default function AppShellContent({ children }: { children: ReactNode }) {
  return <Shell header={<AppTopbar />}>{children}</Shell>;
}
