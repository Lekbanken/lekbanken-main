'use client';

import { MouseEvent } from "react";
import { EnvelopeIcon, MagnifyingGlassIcon, UsersIcon } from "@heroicons/react/24/outline";
import { EmptyState, SkeletonTable } from "@/components/ui";
import { UserAdminItem, UserRole, UserStatus, roleLabels, statusLabels } from "../types";
import { UserRowActions } from "./UserRowActions";

type UserTableProps = {
  users: UserAdminItem[];
  isLoading: boolean;
  searchQuery?: string;
  onEdit: (user: UserAdminItem) => void;
  onRowClick?: (user: UserAdminItem) => void;
  onStatusChange: (userId: string, status: UserStatus) => void;
  onRemove: (userId: string) => void;
  onResendInvite: (user: UserAdminItem) => void;
  onInviteClick: () => void;
  onClearFilters?: () => void;
};

// Role badge variants with semantic colors
const roleBadgeStyles: Record<UserRole, { bg: string; text: string; border: string }> = {
  owner: { bg: "bg-amber-500/15", text: "text-amber-700", border: "border-amber-500/30" },
  admin: { bg: "bg-primary/15", text: "text-primary", border: "border-primary/25" },
  editor: { bg: "bg-cyan-500/15", text: "text-cyan-700", border: "border-cyan-500/25" },
  member: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

// Status indicator styles
const statusStyles: Record<UserStatus, { dot: string; text: string }> = {
  active: { dot: "bg-emerald-500", text: "text-emerald-600" },
  invited: { dot: "bg-amber-500", text: "text-amber-600" },
  inactive: { dot: "bg-muted-foreground/50", text: "text-muted-foreground" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export function UserTable({
  users,
  isLoading,
  searchQuery,
  onEdit,
  onRowClick,
  onStatusChange,
  onRemove,
  onResendInvite,
  onInviteClick,
}: UserTableProps) {
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, user: UserAdminItem) => {
    if ((event.target as HTMLElement).closest("[data-no-row-click]")) return;
    if (onRowClick) {
      onRowClick(user);
    } else {
      onEdit(user);
    }
  };

  if (isLoading) {
    return <SkeletonTable rows={6} columns={6} />;
  }

  if (users.length === 0) {
    return (
      <EmptyState
        icon={searchQuery ? <MagnifyingGlassIcon className="h-8 w-8" /> : <UsersIcon className="h-8 w-8" />}
        title={searchQuery ? "No users match your filters" : "No users yet"}
        description={
          searchQuery
            ? "Try adjusting your search or clearing the filters."
            : "Invite your first team member to get started."
        }
        action={searchQuery ? undefined : { label: "Invite user", onClick: onInviteClick }}
        secondaryAction={searchQuery ? { label: "Clear filters", onClick: onClearFilters } : undefined}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-muted/40">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              User
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Roles
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organisation
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Joined
            </th>
            <th scope="col" className="w-12 px-4 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50 bg-card">
          {users.map((user) => {
            const statusStyle = statusStyles[user.status];
            return (
              <tr
                key={user.id}
                className="cursor-pointer transition-colors duration-150 hover:bg-muted/40"
                onClick={(event) => handleRowClick(event, user)}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary">
                      {(user.name || user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{user.name || user.email}</p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {user.roles.map((role) => {
                      const style = roleBadgeStyles[role as UserRole] || roleBadgeStyles.member;
                      return (
                        <span
                          key={`${user.id}-${role}`}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}
                        >
                          {roleLabels[role as UserRole] || role}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                  {user.organisationName || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${statusStyle.text}`}>
                    {user.status === "invited" ? (
                      <EnvelopeIcon className="h-3.5 w-3.5" />
                    ) : (
                      <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
                    )}
                    {statusLabels[user.status]}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                  <div>{formatDate(user.createdAt)}</div>
                  {user.lastActiveAt && (
                    <div className="text-xs">Last active {formatDate(user.lastActiveAt)}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right" data-no-row-click>
                  <UserRowActions
                    user={user}
                    onEdit={() => onEdit(user)}
                    onStatusChange={onStatusChange}
                    onRemove={onRemove}
                    onResendInvite={onResendInvite}
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
