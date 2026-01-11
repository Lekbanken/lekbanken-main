"use client";

import Image from "next/image";
import { formatDate, formatRelativeTime } from '@/lib/i18n/format-utils';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  UserIcon,
  BuildingOffice2Icon,
  KeyIcon,
  NoSymbolIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from "@/components/ui";
import type {
  AdminUserListItem,
  AdminUserMembershipPreview,
  AdminUserStatus,
} from "../../types";
import {
  userStatusLabels,
  userStatusVariants,
  globalRoleLabels,
  membershipRoleLabels,
} from "../../types";

type UserListItemProps = {
  user: AdminUserListItem;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange?: (userId: string, status: AdminUserStatus) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
};

function getInitials(name: string | null, email: string) {
  const displayName = name || email;
  const parts = displayName.trim().split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function MembershipPreview({ membership }: { membership: AdminUserMembershipPreview }) {
  const t = useTranslations('admin.users');
  const roleLabel = membershipRoleLabels[membership.role as keyof typeof membershipRoleLabels] ?? membership.role;
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <BuildingOffice2Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">
        {membership.tenantName || t('drawer.unknownOrganisation')}
      </span>
      <Badge variant="outline" size="sm" className="text-[10px]">
        {roleLabel}
      </Badge>
      {membership.isPrimary && (
        <Badge variant="accent" size="sm" className="text-[10px]">
          {t('drawer.primary')}
        </Badge>
      )}
    </div>
  );
}

export function UserListItem({
  user,
  canEdit,
  canDelete,
  onStatusChange,
  onRemove,
}: UserListItemProps) {
  const router = useRouter();
  const t = useTranslations('admin.users');
  const { success, error } = useToast();
  const [removeOpen, setRemoveOpen] = useState(false);
  
  const isDisabled = user.status === "disabled";
  const isSystemAdmin = user.globalRole === "system_admin" || user.globalRole === "superadmin";

  const handleRowClick = () => {
    router.push(`/admin/users/${user.id}`);
  };

  const handleCopyUuid = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      success(t('messages.uuidCopied'));
    } catch (err) {
      error(t('errors.couldNotCopyUuid'));
      console.error(err);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      success(t('messages.emailCopied'));
    } catch (err) {
      error(t('errors.couldNotCopyEmail'));
      console.error(err);
    }
  };

  const shortId = user.id.slice(0, 8);
  const displayName = user.name || user.email.split("@")[0];
  const globalRoleLabel = user.globalRole 
    ? globalRoleLabels[user.globalRole as keyof typeof globalRoleLabels] ?? user.globalRole
    : null;

  // Show top 3 memberships
  const visibleMemberships = user.memberships.slice(0, 3);
  const hiddenCount = Math.max(0, user.membershipsCount - 3);

  return (
    <Card className="group border-border/60 transition-all hover:border-border/80 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div
              className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
              role="button"
              tabIndex={0}
              onClick={handleRowClick}
              aria-label={t('listItem.openUser', { name: displayName })}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleRowClick();
              }}
            >
              {/* Avatar */}
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName}
                    fill
                    sizes="48px"
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <span>{getInitials(user.name, user.email)}</span>
                )}
              </div>

              {/* User info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">{displayName}</h3>
                  <Badge variant={userStatusVariants[user.status]} size="sm">
                    {userStatusLabels[user.status]}
                  </Badge>
                  {isSystemAdmin && (
                    <Badge variant="accent" size="sm">
                      <ShieldCheckIcon className="mr-1 h-3 w-3" />
                      {globalRoleLabel}
                    </Badge>
                  )}
                  {user.emailVerified && (
                    <CheckBadgeIcon className="h-4 w-4 text-emerald-500" title="E-post verifierad" />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <EnvelopeIcon className="h-3.5 w-3.5" />
                    {user.email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    aria-label={t('actions.copyEmail')}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleCopyEmail();
                    }}
                  >
                    {t('actions.copy')}
                  </Button>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="font-mono">{shortId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    aria-label={t('actions.copy')}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleCopyUuid();
                    }}
                  >
                    {t('actions.copy')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions menu */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <EllipsisHorizontalIcon className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('actions.quickActions')}</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.id}`}>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      {t('actions.viewUser')}
                    </Link>
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/users/${user.id}?tab=profile`}>
                        <PencilSquareIcon className="h-4 w-4" />
                        {t('actions.editProfile')}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.id}?tab=memberships`}>
                      <BuildingOffice2Icon className="h-4 w-4" />
                      {t('actions.manageMemberships')}
                    </Link>
                  </DropdownMenuItem>
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => void navigator.clipboard.writeText(user.email)}
                      >
                        <EnvelopeIcon className="h-4 w-4" />
                        {t('actions.copyEmail')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled
                        title="Inte implementerat"
                      >
                        <KeyIcon className="h-4 w-4" />
                        {t('actions.sendPasswordReset')}
                      </DropdownMenuItem>
                    </>
                  )}
                  {canEdit && onStatusChange && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => void onStatusChange(user.id, isDisabled ? "active" : "disabled")}
                        className={isDisabled ? "text-emerald-600" : "text-amber-600"}
                      >
                        {isDisabled ? (
                          <>
                            <UserIcon className="h-4 w-4" />
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
                  {canDelete && onRemove && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        destructive
                        onSelect={() => setRemoveOpen(true)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        {t('actions.removeUser')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Memberships preview */}
          {visibleMemberships.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {visibleMemberships.map((membership) => (
                <MembershipPreview key={membership.tenantId} membership={membership} />
              ))}
              {hiddenCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('listItem.moreMembers', { count: hiddenCount })}
                </p>
              )}
            </div>
          )}

          {/* Footer info grid */}
          <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('listItem.memberships')}</p>
              <p className="mt-1 text-sm text-foreground">
                {user.membershipsCount} {user.membershipsCount === 1 ? t('listItem.organisationCount', { count: 1 }).replace('1 ', '') : t('listItem.organisationCountPlural', { count: user.membershipsCount }).replace(`${user.membershipsCount} `, '')}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('listItem.primaryOrg')}</p>
              <p className="mt-1 text-sm text-foreground">
                {user.primaryMembership?.tenantName || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('drawer.lastActive')}</p>
              <p className="mt-1 text-sm text-foreground">
                {formatRelativeTime(user.lastSeenAt || user.lastLoginAt)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{t('listItem.registered')}</p>
              <p className="mt-1 text-sm text-foreground">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      {canDelete && onRemove && (
        <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
          <AlertDialogContent variant="destructive">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialog.removeTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialog.removeDescriptionSimple')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onRemove && void onRemove(user.id)}
              >
                {t('actions.remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
