export type UserStatus = "active" | "inactive" | "invited";

export type UserRole =
  | "system_admin"
  | "organisation_admin"
  | "product_admin"
  | "user"
  | "demo_user"
  | "owner"
  | "admin"
  | "member";

export type UserAdminItem = {
  id: string;
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
  member: "Member",
};

export const statusLabels: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  invited: "Invited",
};
