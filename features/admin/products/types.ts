export type ProductStatus = "active" | "inactive";

export type Capability = {
  id: string;
  key: string;
  label: string;
  description?: string;
  group?: string;
};

export type ProductAdminItem = {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  purposeId?: string | null;
  purposeName?: string | null;
  status: ProductStatus;
  capabilities: Capability[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ProductFilters = {
  search: string;
  status: ProductStatus | "all";
  category: string | "all";
  sort: "recent" | "name" | "capabilities";
};

export const statusLabels: Record<ProductStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};
