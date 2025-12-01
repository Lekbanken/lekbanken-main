'use client'

import { ReactNode } from 'react'

export default function AuthLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
