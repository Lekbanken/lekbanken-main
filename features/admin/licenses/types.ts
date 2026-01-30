/**
 * Types for License Admin feature
 */

export type TenantType = 'private' | 'school' | 'sports' | 'workplace' | 'demo';

export type EntitlementStatus = 'active' | 'inactive' | 'revoked' | 'expired';

export type LicenseFilterType = 'all' | 'private' | 'organization';

export interface LicenseFilters {
  search: string;
  type: LicenseFilterType;
  status: 'all' | EntitlementStatus;
  productId: string | null;
}

export interface LicenseListItem {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: TenantType;
  productId: string;
  productName: string;
  productSlug: string;
  status: EntitlementStatus;
  quantitySeats: number;
  assignedSeats: number;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  // Owner info (for private tenants)
  ownerEmail: string | null;
  ownerName: string | null;
}

export interface LicenseStats {
  total: number;
  active: number;
  private: number;
  organization: number;
}

export interface LicenseListResponse {
  licenses: LicenseListItem[];
  stats: LicenseStats;
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface GrantPersonalLicensePayload {
  userEmail: string;
  productId: string;
  quantitySeats?: number;
  validUntil?: string | null;
  notes?: string;
}

export interface GrantPersonalLicenseResponse {
  success: boolean;
  tenantId: string;
  entitlementId: string;
  message: string;
}
