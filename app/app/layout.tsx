import type { ReactNode } from "react";
import { BottomNav } from "./components/bottom-nav";

export const metadata = {
  title: "Lekbanken – App",
  description: "Mobil-first app med bottom navigation för lekledare.",
};

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-24 pt-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">App</p>
            <h1 className="text-2xl font-semibold">Lekledare</h1>
          </div>
          <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-100">Mobile-first</span>
        </header>

        <main className="mt-8 flex flex-1 flex-col gap-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
