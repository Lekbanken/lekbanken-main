'use client'

import type { ReactNode } from "react";
import AuthLayoutContent from "./auth-layout-content";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthLayoutContent>{children}</AuthLayoutContent>
  );
}

