import type { BadgeVariant } from "@/components/ui/badge";

// =============================================================================
// Legacy types (for backward compatibility with old components)
// =============================================================================

export type UserStatus = "active" | "inactive" | "invited";

export type UserRole =
  | "system_admin"
  | "organisation_admin"
  | "product_admin"
  | "user"
  | "demo_user"
  | "owner"
  | "admin"
  | "editor"
  | "member";

export type UserAdminItem = {
  id: string;
  userId?: string;
  email: string;
  name?: string | null;
  roles: UserRole[];
  organisationName?: string;
  status: UserStatus;
  createdAt?: string | null;
  lastActiveAt?: string | null;
};

export type UserSort = "recent" | "name" | "status";

export type UserFilters = {
  search: string;
  role: UserRole | "all";
  status: UserStatus | "all";
  organisation: string | "all";
  sort: UserSort;
};

export const roleLabels: Record<UserRole, string> = {
  system_admin: "System admin",
  organisation_admin: "Organisation admin",
  product_admin: "Product admin",
  user: "User",
  demo_user: "Demo user",
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  member: "Member",
};

export const statusLabels: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
};

// =============================================================================
// New Admin User types (for the refactored list components)
// =============================================================================

export type AdminUserStatus = "active" | "inactive" | "invited" | "pending" | "disabled";

export type AdminUserGlobalRole =
  | "system_admin"
  | "superadmin"
  | "admin"
  | "member"
  | "private_user"
  | "demo_private_user"
  | "user"
  | "none";

export type AdminUserMembershipRole = "owner" | "admin" | "editor" | "member" | "viewer";

export type AdminUserMembershipStatus =
  | "active"
  | "invited"
  | "pending"
  | "inactive"
  | "suspended"
  | "disabled";

export type AdminUserMembershipPreview = {
  tenantId: string;
  tenantName: string | null;
  tenantStatus: string | null;
  role: AdminUserMembershipRole | string;
  status: AdminUserMembershipStatus | string | null;
  isPrimary: boolean;
  createdAt: string | null;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  status: AdminUserStatus;
  createdAt: string | null;
  updatedAt: string | null;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  emailVerified: boolean | null;
  globalRole: string | null;
  memberships: AdminUserMembershipPreview[];
  membershipsCount: number;
  primaryMembership: AdminUserMembershipPreview | null;
};

export type UserListSort = "recent" | "name" | "last_seen" | "memberships";

export type UserListFilters = {
  search: string;
  status: AdminUserStatus | "all";
  globalRole: AdminUserGlobalRole | "all";
  membershipRole: AdminUserMembershipRole | "all";
  membershipPresence: "all" | "has" | "none";
  primaryTenant: "all" | "has" | "none";
  sort: UserListSort;
};

export const userStatusLabels: Record<AdminUserStatus, string> = {
  active: "Aktiv",
  inactive: "Inaktiv",
  invited: "Inbjuden",
  pending: "Väntar",
  disabled: "Avstängd",
};

export const userStatusVariants: Record<AdminUserStatus, BadgeVariant> = {
  active: "success",
  inactive: "secondary",
  invited: "warning",
  pending: "accent",
  disabled: "destructive",
};

export const globalRoleLabels: Record<AdminUserGlobalRole, string> = {
  system_admin: "Systemadmin",
  superadmin: "Superadmin",
  admin: "Admin",
  member: "Standard",
  private_user: "Privat",
  demo_private_user: "Demo",
  user: "Standard",
  none: "Ingen",
};

/**
 * Helper to check if a global role is a "system admin" level role.
 * Only system_admin, superadmin, and legacy admin are considered system-level.
 */
export function isSystemAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return role === 'system_admin' || role === 'superadmin' || role === 'admin';
}

/**
 * Helper to get a display label for global role, with context.
 * For system admins: shows "Systemadmin"
 * For regular users: returns null (don't show a badge)
 */
export function getSystemRoleBadgeLabel(role: string | null | undefined): string | null {
  if (!role) return null;
  if (role === 'system_admin') return 'Systemadmin';
  if (role === 'superadmin') return 'Superadmin';
  if (role === 'admin') return 'Admin';
  // Regular user types - don't show as a badge
  return null;
}

export const membershipRoleLabels: Record<AdminUserMembershipRole, string> = {
  owner: "Ägare",
  admin: "Admin",
  editor: "Redaktör",
  member: "Medlem",
  viewer: "Läsare",
};

export const membershipStatusLabels: Record<AdminUserMembershipStatus, string> = {
  active: "Aktiv",
  invited: "Inbjuden",
  pending: "Väntar",
  inactive: "Inaktiv",
  suspended: "Pausad",
  disabled: "Avstängd",
};
