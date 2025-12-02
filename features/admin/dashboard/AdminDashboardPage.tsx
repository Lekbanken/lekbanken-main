"use client";

import {
  UsersIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  TrophyIcon,
  RectangleGroupIcon,
  ChartBarIcon,
  BellIcon,
  DocumentTextIcon,
  InboxStackIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MetricCard } from "./components/MetricCard";
import { SectionTile } from "./components/SectionTile";

const metrics = [
  { 
    label: "Totalt användare", 
    value: "2 847", 
    change: "+12% senaste 30 d", 
    trend: "up" as const, 
    icon: <UsersIcon className="h-5 w-5" />,
    iconGradient: "from-blue-500 to-indigo-600"
  },
  { 
    label: "Organisationer", 
    value: "184", 
    change: "+4% senaste 30 d", 
    trend: "up" as const, 
    icon: <BuildingOfficeIcon className="h-5 w-5" />,
    iconGradient: "from-emerald-500 to-teal-600"
  },
  { 
    label: "Publicerat innehåll", 
    value: "1 245", 
    change: "+7% senaste 30 d", 
    trend: "up" as const, 
    icon: <DocumentTextIcon className="h-5 w-5" />,
    iconGradient: "from-amber-500 to-orange-600"
  },
  { 
    label: "Supportärenden öppna", 
    value: "12", 
    change: "-3 st denna vecka", 
    trend: "down" as const, 
    icon: <InboxStackIcon className="h-5 w-5" />,
    iconGradient: "from-rose-500 to-pink-600"
  },
];

const sectionTiles = [
  {
    title: "Användare",
    description: "Hantera roller, åtkomst och status för alla användare.",
    href: "/admin/users",
    icon: <UsersIcon className="h-5 w-5" />,
    iconGradient: "from-blue-500 to-indigo-600",
    stat: { value: "2 847", label: "registrerade" },
  },
  {
    title: "Organisationer",
    description: "Översikt över organisationer, licenser och team.",
    href: "/admin/organisations",
    icon: <BuildingOfficeIcon className="h-5 w-5" />,
    iconGradient: "from-emerald-500 to-teal-600",
    stat: { value: "184", label: "aktiva" },
  },
  {
    title: "Produkt & innehåll",
    description: "Hantera bibliotek, kategorier och publiceringsflöden.",
    href: "/admin/content",
    icon: <RectangleGroupIcon className="h-5 w-5" />,
    iconGradient: "from-amber-500 to-orange-600",
    stat: { value: "1 245", label: "objekt" },
  },
  {
    title: "Achievements / Gamification",
    description: "Bygg badges, events och belöningar för användare.",
    href: "/admin/achievements-advanced",
    icon: <TrophyIcon className="h-5 w-5" />,
    iconGradient: "from-primary to-purple-600",
    stat: { value: "48", label: "aktiva badges" },
  },
  {
    title: "Notifikationer",
    description: "Styr utgående utskick och in-app notiser.",
    href: "/admin/notifications",
    icon: <BellIcon className="h-5 w-5" />,
    iconGradient: "from-pink-500 to-rose-600",
  },
  {
    title: "Analys",
    description: "Dashboard för användning, retention och funnels.",
    href: "/admin/analytics",
    icon: <ChartBarIcon className="h-5 w-5" />,
    iconGradient: "from-cyan-500 to-blue-600",
  },
];

const quickActions = [
  { label: "Skapa användare", href: "/admin/users/new", icon: <UsersIcon className="h-5 w-5" /> },
  { label: "Ny organisation", href: "/admin/organisations/new", icon: <BuildingOfficeIcon className="h-5 w-5" /> },
  { label: "Publicera innehåll", href: "/admin/content/new", icon: <DocumentTextIcon className="h-5 w-5" /> },
  { label: "Öppna inställningar", href: "/admin/settings", icon: <Cog6ToothIcon className="h-5 w-5" /> },
];

export function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Översikt</h1>
          <p className="mt-1 text-sm text-muted-foreground">Snabb åtkomst till de viktigaste admin-ytorna.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" href="/admin/support" size="sm">
            Supportkö
          </Button>
          <Button href="/admin/settings" size="sm">
            <Cog6ToothIcon className="mr-2 h-4 w-4" />
            Inställningar
          </Button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      {/* Section tiles */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Huvudsektioner</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sectionTiles.map((tile) => (
            <SectionTile key={tile.href} {...tile} />
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Snabbåtgärder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Button 
                key={action.href} 
                variant="outline" 
                className="h-auto flex-col gap-2 py-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md" 
                href={action.href}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {action.icon}
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
