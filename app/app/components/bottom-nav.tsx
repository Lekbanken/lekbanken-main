"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", label: "Hem" },
  { href: "/app/games", label: "Spel" },
  { href: "/app/play", label: "Lek" },
  { href: "/app/planner", label: "Planer" },
  { href: "/app/profile", label: "Profil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[min(520px,90%)] -translate-x-1/2 rounded-full border border-border bg-card px-3 py-2 shadow-lg">
      <ul className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`rounded-full px-3 py-2 transition ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
