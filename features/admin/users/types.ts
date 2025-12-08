export type UserStatus = "active" | "inactive" | "invited";

// Tenant-scoped roles (normalized)
export type UserRole = "owner" | "admin" | "editor" | "member";

// Global roles for auth/users.role
export type GlobalRole = "superadmin" | "admin" | "user";

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
