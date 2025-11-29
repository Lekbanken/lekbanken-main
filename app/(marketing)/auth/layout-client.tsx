'use client'

import { ReactNode } from 'react'

export default function AuthLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white text-slate-900">
      {children}
    </div>
  );
}
