export type AtlasDomain = 'admin' | 'games' | 'planner' | 'media' | 'tenant' | 'product' | 'other';

export const atlasDomainOptions: { id: AtlasDomain; label: string }[] = [
  { id: 'admin', label: 'Admin' },
  { id: 'games', label: 'Games' },
  { id: 'planner', label: 'Planner' },
  { id: 'media', label: 'Media' },
  { id: 'tenant', label: 'Tenant' },
  { id: 'product', label: 'Product' },
  { id: 'other', label: 'Other' },
];

export type AtlasRole = 'system_admin' | 'tenant_admin' | 'license_admin' | 'leader' | 'participant';

export const atlasRoleOptions: { id: AtlasRole; label: string }[] = [
  { id: 'system_admin', label: 'System admin' },
  { id: 'tenant_admin', label: 'Tenant admin' },
  { id: 'license_admin', label: 'License admin' },
  { id: 'leader', label: 'Leader' },
  { id: 'participant', label: 'Participant' },
];

export type AtlasMode = 'ux' | 'data' | 'quality';

export type AtlasNodeType = 'frame' | 'component' | 'table' | 'endpoint';

export type AtlasEdgeRelation = 'navigates' | 'reads' | 'writes' | 'uses' | 'calls' | 'emits';

export type AtlasReviewFlag = 'ux_reviewed' | 'data_linked' | 'rls_checked';

export type AtlasReviewFlags = Record<AtlasReviewFlag, boolean>;

export type AtlasReviewStatus = 'complete' | 'partial' | 'missing';

export const reviewStatusOrder: Record<AtlasReviewStatus, number> = {
  missing: 0,
  partial: 1,
  complete: 2,
};

export const createDefaultReviewFlags = (): AtlasReviewFlags => ({
  ux_reviewed: false,
  data_linked: false,
  rls_checked: false,
});

export function getReviewStatus(flags: AtlasReviewFlags): AtlasReviewStatus {
  const values = Object.values(flags);
  if (values.every(Boolean)) return 'complete';
  if (values.some(Boolean)) return 'partial';
  return 'missing';
}

export interface AtlasFrame {
  id: string;
  name: string;
  route: string;
  domain: AtlasDomain;
  roles: AtlasRole[];
  components: string[];
  reads: string[];
  writes: string[];
  endpoints: string[];
  tags: string[];
  owner?: string;
  notes?: string;
  reviewFlags?: AtlasReviewFlags;
  lastReviewedAt?: string;
  fileRef?: string;
}

export interface AtlasComponent {
  id: string;
  name: string;
  fileRef?: string;
  notes?: string;
}

export interface AtlasTable {
  id: string;
  name: string;
  schema?: string;
  description?: string;
  fileRef?: string;
  notes?: string;
}

export interface AtlasEndpoint {
  id: string;
  method?: string;
  path: string;
  description?: string;
  fileRef?: string;
  notes?: string;
}

export interface AtlasEdge {
  fromType: AtlasNodeType;
  fromId: string;
  toType: AtlasNodeType;
  toId: string;
  relation: AtlasEdgeRelation;
}

export interface AtlasRegistry {
  frames: AtlasFrame[];
  components: AtlasComponent[];
  tables: AtlasTable[];
  endpoints: AtlasEndpoint[];
  edges: AtlasEdge[];
}

export interface AtlasFrameReviewState {
  reviewFlags: AtlasReviewFlags;
  lastReviewedAt?: string;
  notes?: string;
  reviewStatus: AtlasReviewStatus;
}

export type AtlasFrameWithReview = AtlasFrame & AtlasFrameReviewState;

export type AtlasEntity =
  | (AtlasFrameWithReview & { type: 'frame' })
  | (AtlasComponent & { type: 'component' })
  | (AtlasTable & { type: 'table' })
  | (AtlasEndpoint & { type: 'endpoint' });

export interface AtlasSelection {
  type: AtlasNodeType;
  id: string;
}
