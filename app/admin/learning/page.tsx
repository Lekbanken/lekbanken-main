'use client';

import Link from "next/link";
import {
  AcademicCapIcon,
  MapIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightIcon,
  BookOpenIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Card, CardContent, Badge } from "@/components/ui";

type ModuleStatus = "implemented" | "partial" | "planned";

interface LearningModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  status: ModuleStatus;
  features: string[];
}

const statusConfig: Record<ModuleStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  implemented: { label: "Implementerad", variant: "default" },
  partial: { label: "Delvis", variant: "secondary" },
  planned: { label: "Planerad", variant: "outline" },
};

const modules: LearningModule[] = [
  {
    id: "courses",
    title: "Kurser",
    description: "Skapa och hantera utbildningskurser med text, quiz och belöningar.",
    href: "/admin/learning/courses",
    icon: <BookOpenIcon className="h-8 w-8" />,
    status: "partial",
    features: ["Kursinnehåll", "Quiz-builder", "Belöningar", "Versionshantering"],
  },
  {
    id: "paths",
    title: "Lärstigar",
    description: "Bygg lärstigar med förutsättningar och progression.",
    href: "/admin/learning/paths",
    icon: <MapIcon className="h-8 w-8" />,
    status: "planned",
    features: ["Graf-editor", "Förutsättningar", "Onboarding", "Rollbaserade"],
  },
  {
    id: "requirements",
    title: "Krav & Grind",
    description: "Konfigurera vilka kurser som krävs för aktiviteter och roller.",
    href: "/admin/learning/requirements",
    icon: <ShieldCheckIcon className="h-8 w-8" />,
    status: "planned",
    features: ["Aktivitetskrav", "Rollkrav", "Spelkrav", "Globala regler"],
  },
  {
    id: "reports",
    title: "Rapporter",
    description: "Översikt av gruppens framsteg och kursstatistik.",
    href: "/admin/learning/reports",
    icon: <ChartBarIcon className="h-8 w-8" />,
    status: "planned",
    features: ["Framstegsöversikt", "Kursstatistik", "Användarrapporter", "Export"],
  },
];

export default function LearningHubPage() {
  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Utbildning", href: "/admin/learning" },
        ]}
      />
      
      <AdminPageHeader
        title="Utbildning"
        description="Lekledarutbildning - kurser, lärstigar och krav"
        icon={<AcademicCapIcon className="h-8 w-8" />}
      />

      {/* Quick Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <BookOpenIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">3</p>
              <p className="text-sm text-muted-foreground">Aktiva kurser</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <MapIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">1</p>
              <p className="text-sm text-muted-foreground">Lärstigar</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <UserGroupIcon className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">24</p>
              <p className="text-sm text-muted-foreground">Aktiva deltagare</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AcademicCapIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">87%</p>
              <p className="text-sm text-muted-foreground">Snitt godkänt</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {modules.map((module) => {
          const statusInfo = statusConfig[module.status];
          return (
            <Card key={module.id} className="overflow-hidden">
              <CardContent className="p-0">
                <Link href={module.href} className="block p-6 transition-colors hover:bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {module.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{module.title}</h3>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {module.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sandbox Link */}
      <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-foreground">🧪 Sandbox</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Testa och prototypa utbildningsmodulen i sandlådan
            </p>
          </div>
          <Link
            href="/sandbox/learning"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Öppna sandbox
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </AdminPageLayout>
  );
}
