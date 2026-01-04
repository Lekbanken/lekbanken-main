'use client';

import { useRouter } from "next/navigation";
import {
  UsersIcon,
  UserIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui";
import type { MemberSummary } from "../../types";

type OrganisationMembersSummaryProps = {
  tenantId: string;
  summary: MemberSummary;
};

export function OrganisationMembersSummary({
  tenantId,
  summary,
}: OrganisationMembersSummaryProps) {
  const router = useRouter();

  const stats = [
    { label: 'Totalt', value: summary.total, icon: UsersIcon, color: 'text-primary' },
    { label: 'Owners', value: summary.owners, icon: ShieldCheckIcon, color: 'text-emerald-600' },
    { label: 'Admins', value: summary.admins, icon: ShieldCheckIcon, color: 'text-blue-600' },
    { label: 'Medlemmar', value: summary.members, icon: UserIcon, color: 'text-muted-foreground' },
    { label: 'Väntande', value: summary.pendingInvites, icon: EnvelopeIcon, color: 'text-amber-600' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Medlemmar</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/tenant/${tenantId}/members`)}
          className="text-primary"
        >
          Visa alla
          <ArrowRightIcon className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg bg-muted/50 mb-2 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {summary.pendingInvites > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {summary.pendingInvites} inbjudan{summary.pendingInvites > 1 ? 'ar' : ''} väntar på svar
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
