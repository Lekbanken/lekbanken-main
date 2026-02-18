'use client';

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from 'next-intl';
import { formatDateLong } from '@/lib/i18n/format-utils';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UserIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  UserPlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, Input } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { loadMembersData, searchUsers, addMemberToTenant, changeMemberRole, removeMember } from "../../organisationSections.server";
import type { MemberSummary } from "../../types";

type TenantRole = 'owner' | 'admin' | 'member';

type Member = {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: TenantRole;
  status: string | null;
  isPrimary: boolean;
  createdAt: string;
};

type OrganisationMembersListProps = {
  tenantId: string;
  summary: MemberSummary;
  onRefresh: () => void;
};

const roleColors: Record<TenantRole, string> = {
  owner: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const roleIcons: Record<TenantRole, typeof ShieldCheckIcon> = {
  owner: ShieldCheckIcon,
  admin: ShieldCheckIcon,
  member: UserIcon,
};

// User search result type
type UserSearchResult = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  alreadyMember: boolean;
};

// Format date for display
function formatDate(dateString: string): string {
  return formatDateLong(dateString);
}

// Avatar component for search results
function UserAvatar({ user }: { user: UserSearchResult }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.fullName || user.email}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }
  
  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();
  
  return (
    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
      <span className="text-sm font-medium text-primary">{initials}</span>
    </div>
  );
}

// Avatar component
function MemberAvatar({ member }: { member: Member }) {
  if (member.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatarUrl}
        alt={member.fullName || member.email}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  
  const initials = member.fullName
    ? member.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : member.email.slice(0, 2).toUpperCase();
  
  return (
    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
      <span className="text-sm font-medium text-primary">{initials}</span>
    </div>
  );
}

// Add Member Dialog Component
type AddMemberDialogProps = {
  tenantId: string;
  existingMemberIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberAdded: () => void;
};

function AddMemberDialog({
  tenantId,
  existingMemberIds,
  open,
  onOpenChange,
  onMemberAdded,
}: AddMemberDialogProps) {
  const t = useTranslations('admin.organizations.members');
  const { success, error: toastError } = useToast();
  
  const [searchEmail, setSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<TenantRole>('member');
  const [isAdding, setIsAdding] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchEmail('');
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedRole('member');
      setSearchError(null);
    }
  }, [open]);
  
  // Search for users by email
  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedUser(null);
    
    try {
      // Search for users by email (partial match)
      const result = await searchUsers(searchEmail.trim());
      
      if (result.error) {
        console.error('User search failed:', result.error);
        setSearchError(t('searchFailed'));
        return;
      }
      
      if (result.users.length === 0) {
        setSearchError(t('noUserFound'));
        return;
      }
      
      // Mark users that are already members
      const results: UserSearchResult[] = result.users.map((user) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        alreadyMember: existingMemberIds.includes(user.id),
      }));
      
      setSearchResults(results);
    } catch (err) {
      console.error('User search failed:', err);
      setSearchError(t('searchFailed'));
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };
  
  // Add selected user as member
  const handleAddMember = async () => {
    if (!selectedUser) return;
    
    setIsAdding(true);
    try {
      // Insert membership via server action
      const result = await addMemberToTenant({
        tenantId,
        userId: selectedUser.id,
        role: selectedRole,
        email: selectedUser.email,
        fullName: selectedUser.fullName,
      });
      
      if (result.duplicate) {
        toastError(t('alreadyMemberError'));
        return;
      }
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      const roleLabel = selectedRole === 'owner' ? t('roleOwner') : selectedRole === 'admin' ? t('roleAdmin') : t('roleMember');
      success(t('memberAdded', { name: selectedUser.fullName || selectedUser.email, role: roleLabel.toLowerCase() }));
      onOpenChange(false);
      onMemberAdded();
    } catch (err) {
      console.error('Failed to add member:', err);
      toastError(t('addFailed'));
    } finally {
      setIsAdding(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlusIcon className="h-5 w-5" />
            {t('addMember')}
          </DialogTitle>
          <DialogDescription>
            {t('addMemberDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="space-y-2">
            <Label>{t('searchByEmail')}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  placeholder={t('searchPlaceholder')}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchEmail.trim()}
              >
                {isSearching ? t('searching') : t('search')}
              </Button>
            </div>
          </div>
          
          {/* Search error */}
          {searchError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
              {searchError}
            </div>
          )}
          
          {/* Search results */}
          {searchResults.length > 0 && !selectedUser && (
            <div className="space-y-2">
              <Label>{t('searchResults')}</Label>
              <div className="border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => !user.alreadyMember && setSelectedUser(user)}
                    disabled={user.alreadyMember}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      user.alreadyMember 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <UserAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {user.fullName || user.email}
                      </div>
                      {user.fullName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      )}
                    </div>
                    {user.alreadyMember ? (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {t('alreadyMember')}
                      </span>
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Selected user */}
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <UserAvatar user={selectedUser} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {selectedUser.fullName || selectedUser.email}
                  </div>
                  {selectedUser.fullName && (
                    <div className="text-xs text-muted-foreground">
                      {selectedUser.email}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  className="h-8 w-8 p-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Role selection */}
              <div className="space-y-2">
                <Label>{t('role')}</Label>
                <Select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as TenantRole)}
                  options={[
                    { value: 'member', label: t('roleMember') },
                    { value: 'admin', label: t('roleAdmin') },
                    { value: 'owner', label: t('roleOwner') },
                  ]}
                />
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAddMember}
            disabled={!selectedUser || isAdding}
          >
            {isAdding ? t('adding') : t('addMemberButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrganisationMembersList({
  tenantId,
  summary,
  onRefresh,
}: OrganisationMembersListProps) {
  const t = useTranslations('admin.organizations.members');
  const { success, error: toastError } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TenantRole | 'all'>('all');
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  
  // Load members
  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await loadMembersData(tenantId);

      if (result.error) {
        toastError(t('loadFailed'));
        console.error('[OrganisationMembersList] Server action error:', result.error);
        return;
      }

      const mappedMembers: Member[] = result.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.email,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
        role: m.role as TenantRole,
        status: m.status,
        isPrimary: m.isPrimary,
        createdAt: m.createdAt,
      }));

      setMembers(mappedMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
      toastError(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, toastError, t]);
  
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);
  
  // Filter members
  const filteredMembers = members.filter((member) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        member.email.toLowerCase().includes(query) ||
        (member.fullName?.toLowerCase().includes(query) ?? false);
      if (!matchesSearch) return false;
    }
    
    // Role filter
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false;
    }
    
    return true;
  });
  
  // Handle role change
  const handleRoleChange = async (memberId: string, newRole: TenantRole) => {
    setIsUpdatingRole(memberId);
    try {
      const member = members.find(m => m.id === memberId);
      const result = await changeMemberRole({
        tenantId,
        memberId,
        newRole,
        userId: member?.userId,
        email: member?.email,
        oldRole: member?.role,
      });
      
      if (result.error) throw new Error(result.error);
      
      const roleLabel = newRole === 'owner' ? t('roleOwner') : newRole === 'admin' ? t('roleAdmin') : t('roleMember');
      success(t('roleChanged', { role: roleLabel }));
      loadMembers();
      onRefresh();
    } catch (err) {
      console.error('Failed to change role:', err);
      toastError(t('roleChangeFailed'));
    } finally {
      setIsUpdatingRole(null);
    }
  };
  
  // Handle remove member
  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    // Prevent removing owner
    if (member.role === 'owner' && members.filter(m => m.role === 'owner').length <= 1) {
      toastError(t('cannotRemoveOnlyOwner'));
      return;
    }
    
    if (!confirm(t('confirmRemove', { name: member.fullName || member.email }))) {
      return;
    }
    
    try {
      const result = await removeMember({
        tenantId,
        memberId,
        userId: member.userId,
        email: member.email,
        role: member.role,
      });
      
      if (result.error) throw new Error(result.error);
      
      success(t('memberRemoved'));
      loadMembers();
      onRefresh();
    } catch (err) {
      console.error('Failed to remove member:', err);
      toastError(t('removeFailed'));
    }
  };
  
  // Stats cards
  const stats = [
    { label: t('statsTotal'), value: summary.total, icon: UsersIcon },
    { label: t('statsOwners'), value: summary.owners, icon: ShieldCheckIcon },
    { label: t('statsAdmins'), value: summary.admins, icon: ShieldCheckIcon },
    { label: t('statsPending'), value: summary.pendingInvites, icon: EnvelopeIcon },
  ];
  
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Members table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            {t('membersCount', { count: filteredMembers.length })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMembers}
              disabled={isLoading}
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowAddMemberDialog(true)}>
              <UserPlusIcon className="h-4 w-4 mr-1" />
              {t('addMember')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchNameOrEmail')}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as TenantRole | 'all')}
              options={[
                { value: 'all', label: t('allRoles') },
                { value: 'owner', label: t('roleOwner') },
                { value: 'admin', label: t('roleAdmin') },
                { value: 'member', label: t('roleMember') },
              ]}
            />
          </div>
          
          {/* Table */}
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('loading')}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {searchQuery || roleFilter !== 'all' 
                ? t('noMembersMatch')
                : t('noMembersYet')
              }
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      {t('tableUser')}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      {t('tableRole')}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                      {t('tableMemberSince')}
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                      {t('tableActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMembers.map((member) => {
                    const RoleIcon = roleIcons[member.role];
                    const roleLabel = member.role === 'owner' ? t('roleOwner') : member.role === 'admin' ? t('roleAdmin') : t('roleMember');
                    return (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <MemberAvatar member={member} />
                            <div>
                              <div className="font-medium text-sm">
                                {member.fullName || member.email}
                              </div>
                              {member.fullName && (
                                <div className="text-xs text-muted-foreground">
                                  {member.email}
                                </div>
                              )}
                            </div>
                            {member.isPrimary && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {t('primary')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[member.role]}`}>
                            <RoleIcon className="h-3.5 w-3.5" />
                            {roleLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(member.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={isUpdatingRole === member.id}
                              >
                                <EllipsisVerticalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={member.role === 'owner'}
                                onClick={() => handleRoleChange(member.id, 'owner')}
                              >
                                <ShieldCheckIcon className="h-4 w-4 mr-2 text-emerald-600" />
                                {t('makeOwner')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={member.role === 'admin'}
                                onClick={() => handleRoleChange(member.id, 'admin')}
                              >
                                <ShieldCheckIcon className="h-4 w-4 mr-2 text-blue-600" />
                                {t('makeAdmin')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={member.role === 'member'}
                                onClick={() => handleRoleChange(member.id, 'member')}
                              >
                                <UserIcon className="h-4 w-4 mr-2" />
                                {t('makeMember')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                {t('removeFromOrg')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Member Dialog */}
      <AddMemberDialog
        tenantId={tenantId}
        existingMemberIds={members.map(m => m.userId)}
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        onMemberAdded={() => {
          loadMembers();
          onRefresh();
        }}
      />
    </div>
  );
}
