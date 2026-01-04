// ============================================
// List View Types
// ============================================

export type OrganisationListStatus = TenantStatus;

export type AdminOrganisationListItem = {
  id: string;
  name: string;
  slug: string | null;
  status: OrganisationListStatus;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  membersCount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  language: string | null;
  branding: {
    logoUrl: string | null;
  };
  billing: {
    status: SubscriptionStatus | string | null;
    plan: string | null;
    connected: boolean;
    customerId: string | null;
    subscriptionId: string | null;
  };
  domain: {
    hostname: string;
    status: string;
  } | null;
};

export type OrganisationListFilters = {
  search: string;
  status: OrganisationListStatus | "all";
  billing: "all" | "connected" | "not_connected";
  language: string | "all";
  domain: "all" | "yes" | "no";
  sort: "recent" | "name" | "members" | "updated";
};

export type OrganisationCreatePayload = {
  name: string;
  slug?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: OrganisationListStatus;
};

// ============================================
// Organisation Card (Detail View) Types
// ============================================

/**
 * Full tenant status values from database
 */
export type TenantStatus = 'active' | 'trial' | 'suspended' | 'archived' | 'demo' | 'inactive';

/**
 * Tenant type classification
 */
export type TenantType = 'school' | 'sports' | 'workplace' | 'private' | 'demo' | 'organisation';

/**
 * Status labels for all tenant states
 */
export const tenantStatusLabels: Record<TenantStatus, string> = {
  active: "Aktiv",
  trial: "Provperiod",
  suspended: "Avstängd",
  archived: "Arkiverad",
  demo: "Demo",
  inactive: "Inaktiv",
};

/**
 * Status colors for badges
 */
export const tenantStatusColors: Record<TenantStatus, "green" | "blue" | "amber" | "gray" | "purple"> = {
  active: "green",
  trial: "blue",
  suspended: "amber",
  archived: "gray",
  demo: "purple",
  inactive: "gray",
};

/**
 * Type labels for tenant types
 */
export const tenantTypeLabels: Record<TenantType, string> = {
  school: "Skola",
  sports: "Idrott",
  workplace: "Arbetsplats",
  private: "Privat",
  demo: "Demo",
  organisation: "Organisation",
};

/**
 * User reference for audit trails
 */
export type UserReference = {
  email: string;
  fullName: string | null;
};

/**
 * Tenant branding configuration
 */
export type TenantBranding = {
  id: string;
  logoMediaId: string | null;
  logoUrl?: string | null;
  brandNameOverride: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  theme: 'light' | 'dark' | 'auto' | null;
};

/**
 * Custom domain configuration
 */
export type TenantDomain = {
  id: string;
  hostname: string;
  kind: 'subdomain' | 'custom';
  status: 'pending' | 'active' | 'suspended';
  verifiedAt: string | null;
  createdAt: string;
};

/**
 * Feature flag configuration
 */
export type TenantFeature = {
  id: string;
  featureKey: string;
  enabled: boolean;
  value: Record<string, unknown> | null;
};

/**
 * Known feature keys in the system
 */
export const FEATURE_KEYS = [
  'games',
  'planner',
  'coach_diagrams',
  'badges',
  'ai_features',
  'library',
  'conversation_cards',
  'experimental',
] as const;

export type FeatureKey = typeof FEATURE_KEYS[number];

export const featureLabels: Record<FeatureKey, string> = {
  games: "Spel",
  planner: "Planering",
  coach_diagrams: "Coach-diagram",
  badges: "Märken",
  ai_features: "AI-funktioner",
  library: "Bibliotek",
  conversation_cards: "Samtalskort",
  experimental: "Experimentella funktioner",
};

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused';

/**
 * Subscription details
 */
export type TenantSubscription = {
  id: string;
  status: SubscriptionStatus;
  seatsPurchased: number;
  startDate: string;
  renewalDate: string | null;
  cancelledAt: string | null;
  stripeSubscriptionId: string | null;
  product: {
    name: string;
    description: string | null;
  } | null;
};

/**
 * Billing account (Stripe)
 */
export type BillingAccount = {
  id: string;
  provider: 'stripe';
  providerCustomerId: string;
  metadata: Record<string, unknown>;
};

/**
 * Audit log event
 */
export type AuditEvent = {
  id: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: UserReference | null;
};

/**
 * Member summary for quick overview
 */
export type MemberSummary = {
  total: number;
  owners: number;
  admins: number;
  members: number;
  pendingInvites: number;
};

/**
 * Complete organisation detail for card view
 */
export type OrganisationDetail = {
  // Core identity
  id: string;
  name: string;
  slug: string | null;
  status: TenantStatus;
  type: TenantType;
  description: string | null;
  createdAt: string;
  createdBy: UserReference | null;
  updatedAt: string;
  updatedBy: UserReference | null;

  // Contact
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  adminNotes: string | null; // from metadata.admin_notes

  // Locale
  defaultLanguage: string | null;
  mainLanguage: string;
  defaultTheme: string | null;

  // Trial
  trialEndsAt: string | null;
  
  // Branding feature toggle (system admin controlled)
  brandingEnabled: boolean;

  // Related data (loaded separately or joined)
  branding: TenantBranding | null;
  domains: TenantDomain[];
  features: TenantFeature[];
  subscription: TenantSubscription | null;
  billingAccount: BillingAccount | null;
  memberSummary: MemberSummary;
  recentAuditEvents: AuditEvent[];
};

/**
 * Organisation update payload for mutations
 */
export type OrganisationUpdatePayload = {
  name?: string;
  status?: TenantStatus;
  type?: TenantType;
  description?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  defaultLanguage?: string | null;
  defaultTheme?: string | null;
  metadata?: Record<string, unknown>;
};
