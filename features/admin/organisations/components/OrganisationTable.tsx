'use client';

import { MouseEvent } from "react";
import Link from "next/link";
import { BuildingOffice2Icon, MagnifyingGlassIcon, UsersIcon } from "@heroicons/react/24/outline";
import { EmptyState, SkeletonTable } from "@/components/ui";
import { OrganisationAdminItem, OrganisationStatus, statusLabels } from "../types";
import { OrganisationRowActions } from "./OrganisationRowActions";

type OrganisationTableProps = {
  organisations: OrganisationAdminItem[];
  isLoading: boolean;
  searchQuery?: string;
  onEdit: (organisation: OrganisationAdminItem) => void;
  onStatusChange: (organisationId: string, status: OrganisationStatus) => void;
  onRemove: (organisationId: string) => void;
  onCreateClick?: () => void;
};

// Status indicator styles
const statusStyles: Record<OrganisationStatus, { dot: string; text: string }> = {
  active: { dot: "bg-emerald-500", text: "text-emerald-600" },
  inactive: { dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
};

// Plan badge styles by tier
const planBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
  Enterprise: { bg: "bg-primary/15", text: "text-primary", border: "border-primary/20" },
  Business: { bg: "bg-accent/15", text: "text-accent", border: "border-accent/20" },
  Pro: { bg: "bg-accent/15", text: "text-accent", border: "border-accent/20" },
  Starter: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  Sandbox: { bg: "bg-amber-500/15", text: "text-amber-600", border: "border-amber-500/20" },
  default: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export function OrganisationTable({
  organisations,
  isLoading,
  searchQuery,
  onEdit,
  onStatusChange,
  onRemove,
  onCreateClick,
}: OrganisationTableProps) {
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, organisation: OrganisationAdminItem) => {
    if ((event.target as HTMLElement).closest("[data-no-row-click]")) return;
    onEdit(organisation);
  };

  if (isLoading) {
    return <SkeletonTable rows={6} columns={6} />;
  }

  if (organisations.length === 0) {
    return (
      <EmptyState
        icon={searchQuery ? <MagnifyingGlassIcon className="h-8 w-8" /> : <BuildingOffice2Icon className="h-8 w-8" />}
        title={searchQuery ? "No organisations match your filters" : "No organisations yet"}
        description={
          searchQuery
            ? "Try adjusting your search or clearing the filters."
            : "Create your first organisation to start managing tenants."
        }
        action={searchQuery ? undefined : onCreateClick ? { label: "Create organisation", onClick: onCreateClick } : undefined}
        secondaryAction={searchQuery ? { label: "Clear filters", onClick: () => {} } : undefined}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-muted/40">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organisation
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contact
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Members
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Created
            </th>
            <th scope="col" className="w-12 px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 bg-card">
          {organisations.map((org) => {
            const statusStyle = statusStyles[org.status];
            const planStyle = org.subscriptionPlan 
              ? planBadgeStyles[org.subscriptionPlan] || planBadgeStyles.default 
              : null;

            return (
              <tr
                key={org.id}
                className="cursor-pointer transition-colors duration-150 hover:bg-muted/40"
                onClick={(event) => handleRowClick(event, org)}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary">
                      {org.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{org.name}</p>
                      {planStyle && (
                        <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${planStyle.bg} ${planStyle.text} ${planStyle.border}`}>
                          {org.subscriptionPlan}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{org.contactName || "—"}</p>
                    <p className="text-sm text-muted-foreground">{org.contactEmail || "—"}</p>
                    {org.contactPhone && (
                      <p className="text-xs text-muted-foreground">{org.contactPhone}</p>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {org.membersCount !== null && org.membersCount !== undefined ? (
                    <Link 
                      href={`/admin/users?orgId=${org.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                      data-no-row-click
                    >
                      {org.membersCount}
                      <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusStyle.text}`}>
                    <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                    {statusLabels[org.status]}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  {formatDate(org.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right" data-no-row-click>
                  <OrganisationRowActions
                    organisation={org}
                    onEdit={() => onEdit(org)}
                    onStatusChange={onStatusChange}
                    onRemove={onRemove}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
