export type OrganisationStatus = "active" | "inactive";

export type OrganisationAdminItem = {
  id: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: OrganisationStatus;
  membersCount?: number | null;
  subscriptionPlan?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type OrganisationFilters = {
  search: string;
  status: OrganisationStatus | "all";
  sort: "recent" | "name" | "members";
};

export const statusLabels: Record<OrganisationStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};
