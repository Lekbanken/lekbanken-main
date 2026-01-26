/**
 * Annotations Schema for Atlas
 *
 * Defines the structure for manual annotations that overlay inventory.json data.
 * Annotations are stored in .atlas/annotations.json and persist human decisions.
 */

// ============================================
// Review Flags
// ============================================

export interface AtlasAnnotationReviewFlags {
  /** UX/design has been reviewed */
  ux_reviewed: boolean;
  /** Data flow has been documented */
  data_linked: boolean;
  /** RLS policies have been verified */
  rls_checked: boolean;
  /** Tests exist and pass */
  tested: boolean;
}

export const createDefaultReviewFlags = (): AtlasAnnotationReviewFlags => ({
  ux_reviewed: false,
  data_linked: false,
  rls_checked: false,
  tested: false,
});

// ============================================
// Cleanup Status
// ============================================

export type CleanupStatus = 'not_started' | 'in_progress' | 'cleaned' | 'locked';

export const CLEANUP_STATUS_OPTIONS: { value: CleanupStatus; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'text-gray-500' },
  { value: 'in_progress', label: 'In Progress', color: 'text-yellow-600' },
  { value: 'cleaned', label: 'Cleaned', color: 'text-green-600' },
  { value: 'locked', label: 'Locked', color: 'text-blue-600' },
];

// ============================================
// Translation Status
// ============================================

export type TranslationStatus = 'n/a' | 'pending' | 'done';

export const TRANSLATION_STATUS_OPTIONS: { value: TranslationStatus; label: string; color: string }[] = [
  { value: 'n/a', label: 'N/A', color: 'text-gray-400' },
  { value: 'pending', label: 'Pending', color: 'text-orange-500' },
  { value: 'done', label: 'Done', color: 'text-green-600' },
];

// ============================================
// Single Annotation
// ============================================

export interface Annotation {
  /** Review status flags */
  reviewFlags: AtlasAnnotationReviewFlags;

  /** Cleanup progress */
  cleanup_status: CleanupStatus;

  /** Translation status (for UI routes) */
  translation_status: TranslationStatus;

  /** Owner (team or person responsible) */
  owner?: string;

  /** Free-form notes */
  notes?: string;

  /** When the node was last reviewed */
  lastReviewedAt?: string;

  /** When the annotation was last modified */
  lastModifiedAt?: string;
}

export const createDefaultAnnotation = (): Annotation => ({
  reviewFlags: createDefaultReviewFlags(),
  cleanup_status: 'not_started',
  translation_status: 'n/a',
});

// ============================================
// Annotations File
// ============================================

/**
 * The root structure of .atlas/annotations.json
 */
export interface AnnotationsFile {
  /** Schema version for migrations */
  version: '1.0';

  /** ISO timestamp of last modification */
  lastModified: string;

  /** Map of node ID → Annotation */
  annotations: Record<string, Annotation>;
}

export const createEmptyAnnotationsFile = (): AnnotationsFile => ({
  version: '1.0',
  lastModified: new Date().toISOString(),
  annotations: {},
});

// ============================================
// Merged Node (inventory + annotation)
// ============================================

/**
 * A node that combines inventory data with manual annotations
 */
export interface MergedAtlasNode {
  // From inventory
  id: string;
  type: string;
  name: string;
  path?: string;
  ownerDomain: string;
  risk: string;
  usage: string;
  confidence: number;
  exposure: string;

  // From annotation (with defaults)
  reviewFlags: AtlasAnnotationReviewFlags;
  cleanup_status: CleanupStatus;
  translation_status: TranslationStatus;
  owner?: string;
  notes?: string;
  lastReviewedAt?: string;
  lastModifiedAt?: string;

  // Computed
  hasAnnotation: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Merge an inventory node with its annotation (if exists)
 */
export function mergeNodeWithAnnotation(
  node: {
    id: string;
    type: string;
    name: string;
    path?: string | null;
    ownerDomain: string;
    risk: string;
    status: { usage: string; confidence: number };
    exposure: string;
  },
  annotation?: Annotation
): MergedAtlasNode {
  const defaultAnnotation = createDefaultAnnotation();

  return {
    // From inventory
    id: node.id,
    type: node.type,
    name: node.name,
    path: node.path ?? undefined,
    ownerDomain: node.ownerDomain,
    risk: node.risk,
    usage: node.status.usage,
    confidence: node.status.confidence,
    exposure: node.exposure,

    // From annotation (with defaults)
    reviewFlags: annotation?.reviewFlags ?? defaultAnnotation.reviewFlags,
    cleanup_status: annotation?.cleanup_status ?? defaultAnnotation.cleanup_status,
    translation_status: annotation?.translation_status ?? defaultAnnotation.translation_status,
    owner: annotation?.owner,
    notes: annotation?.notes,
    lastReviewedAt: annotation?.lastReviewedAt,
    lastModifiedAt: annotation?.lastModifiedAt,

    // Computed
    hasAnnotation: annotation !== undefined,
  };
}

/**
 * Calculate completion percentage based on review flags
 */
export function calculateReviewCompletion(flags: AtlasAnnotationReviewFlags): number {
  const values = Object.values(flags);
  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

/**
 * Determine if a node is "safe to refactor"
 */
export function isSafeToRefactor(annotation?: Annotation): boolean {
  if (!annotation) return false;

  const allFlagsTrue = Object.values(annotation.reviewFlags).every(Boolean);
  const isCleanedOrLocked =
    annotation.cleanup_status === 'cleaned' || annotation.cleanup_status === 'locked';
  const hasOwner = Boolean(annotation.owner);

  return allFlagsTrue && isCleanedOrLocked && hasOwner;
}

/**
 * Get refactor safety level
 */
export type SafetyLevel = 'safe' | 'partial' | 'not-safe';

export function getRefactorSafetyLevel(annotation?: Annotation): SafetyLevel {
  if (!annotation) return 'not-safe';

  const flagsTrue = Object.values(annotation.reviewFlags).filter(Boolean).length;
  const hasOwner = Boolean(annotation.owner);
  const isCleanedOrLocked =
    annotation.cleanup_status === 'cleaned' || annotation.cleanup_status === 'locked';

  if (isSafeToRefactor(annotation)) return 'safe';
  if (flagsTrue > 0 || hasOwner || isCleanedOrLocked) return 'partial';
  return 'not-safe';
}
