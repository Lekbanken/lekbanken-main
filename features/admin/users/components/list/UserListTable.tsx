'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  EllipsisHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  PencilSquareIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  NoSymbolIcon,
  TrashIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  useToast,
} from '@/components/ui';
import type {
  AdminUserListItem,
  AdminUserStatus,
} from '../../types';
import {
  userStatusLabels,
  userStatusVariants,
  membershipRoleLabels,
  isSystemAdminRole,
  getSystemRoleBadgeLabel,
} from '../../types';

// =============================================================================
// Types
// =============================================================================

type UserListTableProps = {
  users: AdminUserListItem[];
  isLoading?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSelectUser: (user: AdminUserListItem) => void;
  onStatusChange?: (userId: string, status: AdminUserStatus) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
};

// =============================================================================
// Helper Functions
// =============================================================================

function createFormatRelativeTime(t: ReturnType<typeof useTranslations<'admin.users'>>) {
  return function formatRelativeTime(value: string | null) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return `${diffMins} ${t('time.min')}`;
    if (diffHours < 24) return `${diffHours} ${t('time.hour')}`;
    if (diffDays === 1) return t('time.yesterday');
    if (diffDays < 7) return `${diffDays} ${t('time.day')}`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${t('time.week')}`;
    return `${Math.floor(diffDays / 30)} ${t('time.month')}`;
  };
}

function getInitials(name: string | null, email: string) {
  const displayName = name || email;
  const parts = displayName.trim().split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Get highest tenant role from memberships */
function getHighestTenantRole(memberships: AdminUserListItem['memberships']): string | null {
  if (memberships.length === 0) return null;
  const roleOrder = ['owner', 'admin', 'editor', 'member', 'viewer'];
  const roles = memberships.map(m => m.role);
  for (const r of roleOrder) {
    if (roles.includes(r)) return r;
  }
  return roles[0] || null;
}

// =============================================================================
// Table Row Component
// =============================================================================

function UserListTableRow({
  user,
  canEdit,
  canDelete,
  onSelect,
  onStatusChange,
  onRequestRemove,
}: {
  user: AdminUserListItem;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStatusChange?: (userId: string, status: AdminUserStatus) => Promise<void>;
  onRequestRemove?: () => void;
}) {
  const t = useTranslations('admin.users');
  const { success } = useToast();
  const formatRelativeTime = createFormatRelativeTime(t);
  
  const displayName = user.name || user.email.split('@')[0];
  const _isSystemAdmin = isSystemAdminRole(user.globalRole);
  const isDisabled = user.status === 'disabled';
  const systemRoleBadgeLabel = getSystemRoleBadgeLabel(user.globalRole);
  const highestTenantRole = getHighestTenantRole(user.memberships);

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(user.email);
    success(t('messages.emailCopied'));
  };

  return (
    <>
      <tr 
        className="border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer group"
        onClick={onSelect}
      >
        {/* Avatar + Name + Email */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/15 to-primary/5 text-sm font-medium text-primary">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={displayName}
                  fill
                  sizes="36px"
                  className="rounded-full object-cover"
                />
              ) : (
                <span>{getInitials(user.name, user.email)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-foreground truncate">{displayName}</p>
                {user.emailVerified && (
                  <CheckBadgeIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" title="Verifierad" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </td>

        {/* System Role */}
        <td className="py-3 px-4">
          {systemRoleBadgeLabel ? (
            <Badge variant="accent" size="sm">
              <ShieldCheckIcon className="mr-1 h-3 w-3" />
              {systemRoleBadgeLabel}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>

        {/* Highest Tenant Role */}
        <td className="py-3 px-4">
          {highestTenantRole ? (
            <Badge variant="outline" size="sm">
              {membershipRoleLabels[highestTenantRole as keyof typeof membershipRoleLabels] ?? highestTenantRole}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>

        {/* Organisations */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <BuildingOffice2Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {user.membershipsCount > 0 ? (
                <span className="text-foreground">{user.membershipsCount}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </span>
          </div>
        </td>

        {/* Last Active */}
        <td className="py-3 px-4">
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(user.lastSeenAt || user.lastLoginAt)}
          </span>
        </td>

        {/* Status */}
        <td className="py-3 px-4">
          <Badge variant={userStatusVariants[user.status]} size="sm">
            {userStatusLabels[user.status]}
          </Badge>
        </td>

        {/* Actions */}
        <td className="py-3 px-4 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                {t('actions.viewDetails')}
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                  <PencilSquareIcon className="h-4 w-4" />
                  {t('actions.edit')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleCopyEmail}>
                <EnvelopeIcon className="h-4 w-4" />
                {t('actions.copyEmail')}
              </DropdownMenuItem>
              
              {canEdit && onStatusChange && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      void onStatusChange(user.id, isDisabled ? 'active' : 'disabled');
                    }}
                    className={isDisabled ? 'text-emerald-600' : 'text-amber-600'}
                  >
                    {isDisabled ? (
                      <>
                        <CheckBadgeIcon className="h-4 w-4" />
                        {t('actions.reactivate')}
                      </>
                    ) : (
                      <>
                        <NoSymbolIcon className="h-4 w-4" />
                        {t('actions.disable')}
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              
              {canDelete && onRequestRemove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestRemove();
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t('actions.remove')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    </>
  );
}

// =============================================================================
// Main Table Component
// =============================================================================

/**
 * UserListTable - Table-based list view for users
 * 
 * Architecture decision: Using a table for dense scanning of many users,
 * matching the high-information-density goal of system admin tools.
 * Rows are clickable to open user details in drawer.
 */
export function UserListTable({
  users,
  canEdit,
  canDelete,
  onSelectUser,
  onStatusChange,
  onRemove,
}: UserListTableProps) {
  const t = useTranslations('admin.users');
  const [userToRemove, setUserToRemove] = useState<AdminUserListItem | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.user')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.systemRole')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.tenantRole')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.org')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.lastActive')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.status')}
              </th>
              <th className="text-right py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground w-16">
                <span className="sr-only">{t('table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserListTableRow
                key={user.id}
                user={user}
                canEdit={canEdit}
                canDelete={canDelete}
                onSelect={() => onSelectUser(user)}
                onStatusChange={onStatusChange}
                onRequestRemove={canDelete && onRemove ? () => setUserToRemove(user) : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination info */}
      {users.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {t('table.showingUsers', { count: users.length })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              {t('actions.previous')}
            </Button>
            <Button variant="outline" size="sm" disabled>
              {t('actions.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog - rendered outside table to avoid hydration errors */}
      {canDelete && onRemove && (
        <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
          <AlertDialogContent variant="destructive">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialog.removeTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {userToRemove && t('dialog.removeDescription', { 
                  email: userToRemove.email, 
                  count: userToRemove.membershipsCount 
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  if (userToRemove) {
                    void onRemove(userToRemove.id);
                    setUserToRemove(null);
                  }
                }}
              >
                {t('actions.remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// =============================================================================
// Table Skeleton
// =============================================================================

export function UserListTableSkeleton({ rows = 6 }: { rows?: number }) {
  const t = useTranslations('admin.users');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.user')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.systemRole')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.tenantRole')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.org')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.lastActive')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('table.status')}
              </th>
              <th className="text-right py-3 px-4 w-16">
                <span className="sr-only">{t('table.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, index) => (
              <tr key={index} className="border-b border-border/40">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-40 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-5 w-14 bg-muted animate-pulse rounded-full" />
                </td>
                <td className="py-3 px-4">
                  <div className="h-8 w-8 bg-muted animate-pulse rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
