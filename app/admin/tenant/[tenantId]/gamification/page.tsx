'use client';

import Link from "next/link";
import { TrophyIcon, StarIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminCard } from "@/components/admin/shared";
import { useTenant } from "@/lib/context/TenantContext";

const gamificationFeatures = [
  {
    id: 'achievements',
    name: 'Utmärkelser',
    description: 'Skapa och hantera utmärkelser som dina deltagare kan låsa upp',
    icon: TrophyIcon,
    href: (tenantId: string) => `/admin/tenant/${tenantId}/gamification/achievements`,
    stats: null,
  },
  // Future: Leaderboards, Challenges, Rewards, etc.
];

export default function TenantGamificationHubPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Gamification"
        description="Engagera deltagare med utmärkelser, utmaningar och belöningar"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {gamificationFeatures.map((feature) => (
          <Link
            key={feature.id}
            href={tenantId ? feature.href(tenantId) : '#'}
            className="group"
          >
            <AdminCard className="h-full transition-shadow hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                    {feature.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {feature.description}
                  </p>
                  {feature.stats && (
                    <p className="mt-2 text-sm font-medium text-primary">
                      {feature.stats}
                    </p>
                  )}
                </div>
              </div>
            </AdminCard>
          </Link>
        ))}
      </div>

      {/* Placeholder for future expansion */}
      <div className="mt-8">
        <AdminCard>
          <div className="flex items-center gap-3 text-slate-500">
            <StarIcon className="h-5 w-5" />
            <p className="text-sm">
              Fler gamification-funktioner kommer snart: tävlingar, leaderboards, belöningar och mer.
            </p>
          </div>
        </AdminCard>
      </div>
    </AdminPageLayout>
  );
}
