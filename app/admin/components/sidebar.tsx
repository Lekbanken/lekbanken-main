"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/organisations", label: "Organisationer" },
  { href: "/admin/users", label: "Användare" },
  { href: "/admin/licenses", label: "Licenser" },
  { href: "/admin/content", label: "Innehåll" },
  { href: "/admin/analytics", label: "Analys" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/settings", label: "Inställningar" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 flex-shrink-0 border-r border-slate-200 bg-white/60 p-6 backdrop-blur lg:block">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Admin</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Kontrollpanel</h2>
      <nav className="mt-6 space-y-1 text-sm font-medium text-slate-700">
        {modules.map((module) => {
          const isActive = pathname === module.href;
          return (
            <Link
              key={module.href}
              href={module.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
                isActive ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100"
              }`}
            >
              <span>{module.label}</span>
              {isActive ? <span className="text-xs">•</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
