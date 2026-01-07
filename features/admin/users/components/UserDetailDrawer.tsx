'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import {
  XMarkIcon,
  UserIcon,
  BuildingOffice2Icon,
  ShieldCheckIcon,
  ClockIcon,
  EnvelopeIcon,
  KeyIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Tabs,
  TabPanel,
  Card,
  CardContent,
  useToast,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import type {
  AdminUserListItem,
  AdminUserMembershipPreview,
  AdminUserStatus,
} from '../types';
import {
  userStatusLabels,
  userStatusVariants,
  membershipRoleLabels,
  membershipStatusLabels,
  isSystemAdminRole,
  getSystemRoleBadgeLabel,
} from '../types';
import { sendPasswordResetEmail, updateUserPassword } from '../userActions.server';

// =============================================================================
// Types
// =============================================================================

type UserDetailDrawerProps = {
  user: AdminUserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
  canDelete: boolean;
  onStatusChange?: (userId: string, status: AdminUserStatus) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
  onRefresh?: () => void;
};

type TabId = 'overview' | 'organisations' | 'security' | 'activity';

// =============================================================================
// Helper Functions
// =============================================================================

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} tim sedan`;
  if (diffDays === 1) return 'Igår';
  if (diffDays < 7) return `${diffDays} dagar sedan`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} veckor sedan`;
  return formatDate(value);
}

function getInitials(name: string | null, email: string) {
  const displayName = name || email;
  const parts = displayName.trim().split(/[\s@]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

// =============================================================================
// Sub-components
// =============================================================================

/** Copyable field with click-to-copy functionality */
function CopyableField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { success } = useToast();
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    success('Kopierad till urklipp');
  };

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-sm text-foreground ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </p>
        <button
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Kopiera"
        >
          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** Info row for displaying key-value pairs */
function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && (
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

/** Organisation membership card */
function MembershipCard({
  membership,
  _canEdit,
  _onRemove,
  _onChangeRole,
}: {
  membership: AdminUserMembershipPreview;
  _canEdit: boolean;
  _onRemove?: () => void;
  _onChangeRole?: () => void;
}) {
  const roleLabel = membershipRoleLabels[membership.role as keyof typeof membershipRoleLabels] ?? membership.role;
  const statusLabel = membershipStatusLabels[membership.status as keyof typeof membershipStatusLabels] ?? membership.status;
  
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Org icon/logo placeholder */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
            <BuildingOffice2Icon className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-foreground">
                {membership.tenantName || 'Okänd organisation'}
              </h4>
              {membership.isPrimary && (
                <Badge variant="accent" size="sm">Primär</Badge>
              )}
            </div>
            
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" size="sm">{roleLabel}</Badge>
              <Badge 
                variant={membership.status === 'active' ? 'success' : 'secondary'} 
                size="sm"
              >
                {statusLabel}
              </Badge>
            </div>
            
            <p className="mt-2 text-xs text-muted-foreground">
              Medlem sedan {formatDate(membership.createdAt)}
            </p>
          </div>
          
          {/* Quick actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              href={`/admin/organisations/${membership.tenantId}`}
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Empty state for tabs with no content */
function TabEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <ExclamationTriangleIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-foreground">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * UserDetailDrawer - Side drawer for viewing and editing user details
 * 
 * Architecture decision: Using Sheet (drawer) instead of full page for quick editing
 * while maintaining list context. Matches Organisations admin pattern.
 */
export function UserDetailDrawer({
  user,
  open,
  onOpenChange,
  canEdit,
  canDelete,
  onStatusChange,
  onRemove,
  onRefresh,
}: UserDetailDrawerProps) {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isUpdating, setIsUpdating] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  
  // Password management state
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Reset tab when user changes
  useEffect(() => {
    if (user) {
      setActiveTab('overview');
    }
  // Only reset when user id changes, not entire user object
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Note: Unused but kept for future use in Overview tab
  const _handleCopyUuid = useCallback(async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.id);
      success('UUID kopierad');
    } catch {
      toastError('Kunde inte kopiera UUID');
    }
  }, [user, success, toastError]);

  const handleStatusToggle = useCallback(async () => {
    if (!user || !onStatusChange) return;
    const newStatus: AdminUserStatus = user.status === 'disabled' ? 'active' : 'disabled';
    
    setIsUpdating(true);
    try {
      await onStatusChange(user.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  }, [user, onStatusChange]);

  const handleRemove = useCallback(async () => {
    if (!user || !onRemove) return;
    
    setIsUpdating(true);
    try {
      await onRemove(user.id);
      setRemoveDialogOpen(false);
      onOpenChange(false);
    } finally {
      setIsUpdating(false);
    }
  }, [user, onRemove, onOpenChange]);

  // Password management handlers
  const handleSendPasswordReset = useCallback(async () => {
    if (!user?.email) return;
    setIsSendingReset(true);
    try {
      const result = await sendPasswordResetEmail(user.email);
      if (result.success) {
        success('Återställningsmail skickat', `E-post skickad till ${user.email}`);
      } else {
        toastError(result.error || 'Kunde inte skicka återställningsmail');
      }
    } catch {
      toastError('Ett oväntat fel uppstod');
    } finally {
      setIsSendingReset(false);
    }
  }, [user?.email, success, toastError]);

  const handleUpdatePassword = useCallback(async () => {
    if (!user?.id || !newPassword || newPassword.length < 6) {
      toastError('Lösenord måste vara minst 6 tecken');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const result = await updateUserPassword(user.id, newPassword);
      if (result.success) {
        success('Lösenord uppdaterat', 'Användaren kan nu logga in med det nya lösenordet');
        setNewPassword('');
        setShowPasswordInput(false);
      } else {
        toastError(result.error || 'Kunde inte uppdatera lösenord');
      }
    } catch {
      toastError('Ett oväntat fel uppstod');
    } finally {
      setIsUpdatingPassword(false);
    }
  }, [user?.id, newPassword, success, toastError]);

  if (!user) return null;

  const displayName = user.name || user.email.split('@')[0];
  const _isSystemAdmin = isSystemAdminRole(user.globalRole);
  const isDisabled = user.status === 'disabled';
  const systemRoleBadgeLabel = getSystemRoleBadgeLabel(user.globalRole);
  
  // Get highest tenant role for display
  const highestTenantRole = user.memberships.length > 0
    ? (() => {
        const roleOrder = ['owner', 'admin', 'editor', 'member', 'viewer'];
        const roles = user.memberships.map(m => m.role);
        for (const r of roleOrder) {
          if (roles.includes(r)) return r;
        }
        return roles[0] || null;
      })()
    : null;

  const tabs = [
    { id: 'overview', label: 'Översikt', icon: <UserIcon className="h-4 w-4" /> },
    { id: 'organisations', label: 'Organisationer', icon: <BuildingOffice2Icon className="h-4 w-4" />, badge: user.membershipsCount },
    { id: 'security', label: 'Säkerhet', icon: <ShieldCheckIcon className="h-4 w-4" /> },
    { id: 'activity', label: 'Aktivitet', icon: <ClockIcon className="h-4 w-4" /> },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto"
        >
          {/* Header */}
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-semibold text-primary">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName}
                    fill
                    sizes="64px"
                    className="rounded-xl object-cover"
                  />
                ) : (
                  <span>{getInitials(user.name, user.email)}</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="text-xl">{displayName}</SheetTitle>
                  <Badge variant={userStatusVariants[user.status]}>
                    {userStatusLabels[user.status]}
                  </Badge>
                  {systemRoleBadgeLabel && (
                    <Badge variant="accent">
                      <ShieldCheckIcon className="mr-1 h-3 w-3" />
                      {systemRoleBadgeLabel}
                    </Badge>
                  )}
                </div>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <EnvelopeIcon className="h-3.5 w-3.5" />
                  {user.email}
                  {user.emailVerified && (
                    <CheckBadgeIcon className="h-4 w-4 text-emerald-500" title="E-post verifierad" />
                  )}
                </SheetDescription>
              </div>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Tabs */}
          <div className="py-4 border-b border-border">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId as TabId)}
              variant="underline"
              size="sm"
            />
          </div>

          {/* Tab Content */}
          <div className="py-6">
            {/* Overview Tab */}
            <TabPanel id="overview" activeTab={activeTab}>
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Grundläggande information</h3>
                  <div className="space-y-4">
                    <CopyableField label="E-post" value={user.email} />
                    <CopyableField label="Användar-UUID" value={user.id} mono />
                    {user.name && (
                      <InfoRow label="Fullständigt namn" value={user.name} />
                    )}
                  </div>
                </div>
                
                <hr className="border-border" />

                {/* Account Status */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Kontostatus</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow 
                      label="Status" 
                      value={
                        <Badge variant={userStatusVariants[user.status]}>
                          {userStatusLabels[user.status]}
                        </Badge>
                      } 
                    />
                    <InfoRow 
                      label="E-post verifierad" 
                      value={user.emailVerified ? 'Ja' : 'Nej'} 
                    />
                    <InfoRow label="Registrerad" value={formatDate(user.createdAt)} />
                    <InfoRow label="Senast aktiv" value={formatRelativeTime(user.lastSeenAt || user.lastLoginAt)} />
                  </div>
                </div>

                <hr className="border-border" />

                {/* Roller */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Roller</h3>
                  <div className="space-y-3">
                    {/* System Role */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Systemroll</p>
                        <div className="flex items-center gap-2">
                          {systemRoleBadgeLabel ? (
                            <>
                              <Badge variant="accent">
                                <ShieldCheckIcon className="mr-1 h-3 w-3" />
                                {systemRoleBadgeLabel}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Har tillgång till systemadministration
                              </p>
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">Ingen systemadminroll</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Highest Tenant Role */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Högsta tenantroll</p>
                        <div className="flex items-center gap-2">
                          {highestTenantRole ? (
                            <Badge variant="outline">
                              {membershipRoleLabels[highestTenantRole as keyof typeof membershipRoleLabels] ?? highestTenantRole}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Ingen organisation</span>
                          )}
                          {user.membershipsCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                              i {user.membershipsCount} organisation{user.membershipsCount > 1 ? 'er' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                {(canEdit || canDelete) && (
                  <>
                    <hr className="border-border" />
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-4">Snabbåtgärder</h3>
                      <div className="flex flex-wrap gap-2">
                        {canEdit && onStatusChange && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleStatusToggle}
                            disabled={isUpdating}
                            className={isDisabled ? 'text-emerald-600' : 'text-amber-600'}
                          >
                            {isDisabled ? (
                              <>
                                <CheckBadgeIcon className="h-4 w-4 mr-1" />
                                Återaktivera
                              </>
                            ) : (
                              <>
                                <NoSymbolIcon className="h-4 w-4 mr-1" />
                                Stäng av
                              </>
                            )}
                          </Button>
                        )}
                        {canDelete && onRemove && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRemoveDialogOpen(true)}
                            disabled={isUpdating}
                            className="text-destructive"
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Ta bort
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabPanel>

            {/* Organisations Tab */}
            <TabPanel id="organisations" activeTab={activeTab}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    Organisationsmedlemskap ({user.membershipsCount})
                  </h3>
                  {canEdit && (
                    <Button variant="outline" size="sm" disabled>
                      Lägg till organisation
                    </Button>
                  )}
                </div>

                {user.memberships.length === 0 ? (
                  <TabEmptyState
                    title="Inga organisationer"
                    description="Användaren är inte medlem i någon organisation."
                  />
                ) : (
                  <div className="space-y-3">
                    {user.memberships.map((membership) => (
                      <MembershipCard
                        key={membership.tenantId}
                        membership={membership}
                        _canEdit={canEdit}
                      />
                    ))}
                  </div>
                )}
              </div>
            </TabPanel>

            {/* Security Tab */}
            <TabPanel id="security" activeTab={activeTab}>
              <div className="space-y-6">
                {/* Auth Providers */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Autentisering</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <EnvelopeIcon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">E-post & lösenord</p>
                        <p className="text-xs text-muted-foreground">
                          {user.emailVerified ? 'Verifierad' : 'Ej verifierad'}
                        </p>
                      </div>
                      {user.emailVerified && (
                        <CheckBadgeIcon className="h-5 w-5 text-emerald-500" />
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                {/* Last Login */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Senaste inloggning</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoRow 
                      label="Senaste inloggning" 
                      value={formatDateTime(user.lastLoginAt)} 
                      icon={<KeyIcon className="h-4 w-4" />}
                    />
                    <InfoRow 
                      label="Senast sedd" 
                      value={formatRelativeTime(user.lastSeenAt)} 
                      icon={<ClockIcon className="h-4 w-4" />}
                    />
                  </div>
                </div>

                <hr className="border-border" />

                {/* Security Actions */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-4">Säkerhetsåtgärder</h3>
                  <div className="space-y-4">
                    {/* Password Reset Email */}
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSendPasswordReset}
                        disabled={isSendingReset || !canEdit}
                      >
                        <EnvelopeIcon className="h-4 w-4 mr-1" />
                        {isSendingReset ? 'Skickar...' : 'Skicka lösenordsåterställning'}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Skickar e-post till {user.email}
                      </span>
                    </div>

                    {/* Change Password */}
                    <div className="space-y-2">
                      {!showPasswordInput ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowPasswordInput(true)}
                          disabled={!canEdit}
                        >
                          <KeyIcon className="h-4 w-4 mr-1" />
                          Ändra lösenord manuellt
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nytt lösenord (minst 6 tecken)"
                            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background"
                            minLength={6}
                          />
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword || newPassword.length < 6}
                          >
                            {isUpdatingPassword ? 'Sparar...' : 'Spara'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setShowPasswordInput(false); setNewPassword(''); }}
                          >
                            Avbryt
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Force Logout - Still disabled */}
                    <div>
                      <Button variant="outline" size="sm" disabled>
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Tvinga utloggning
                      </Button>
                      <span className="ml-2 text-xs text-muted-foreground">
                        Kommer snart
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabPanel>

            {/* Activity Tab */}
            <TabPanel id="activity" activeTab={activeTab}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">Senaste aktivitet</h3>
                  {onRefresh && (
                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Uppdatera
                    </Button>
                  )}
                </div>

                <TabEmptyState
                  title="Aktivitetslogg under utveckling"
                  description="Detaljerad aktivitetshistorik för användare kommer snart."
                />
              </div>
            </TabPanel>
          </div>
        </SheetContent>
      </Sheet>

      {/* Remove confirmation dialog */}
      {canDelete && onRemove && (
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent variant="destructive">
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort användare?</AlertDialogTitle>
              <AlertDialogDescription>
                Detta går inte att ångra. Användarens profil ({user.email}) och alla {user.membershipsCount} medlemskap kommer tas bort permanent.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleRemove}
                disabled={isUpdating}
              >
                {isUpdating ? 'Tar bort...' : 'Ta bort'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
