/**
 * Artifact sub-components barrel export.
 *
 * Director-only components for artifact inspection and management.
 */

// ArtifactInspector — Director sidebar for artifact details
export { ArtifactInspector } from './ArtifactInspector';
export type { ArtifactInspectorProps, InspectorVariant } from './ArtifactInspector';

// ArtifactLinkPills — Step/phase/trigger link display
export { ArtifactLinkPills } from './ArtifactLinkPills';
export type { ArtifactLinkPillsProps } from './ArtifactLinkPills';

// ArtifactTimeline — Per-artifact event history (PR #3)
export { ArtifactTimeline } from './ArtifactTimeline';
export type { ArtifactTimelineProps } from './ArtifactTimeline';

// PinnedArtifactBar — Quick-access pinned artifacts strip (PR #4)
export { PinnedArtifactBar } from './PinnedArtifactBar';
export type { PinnedArtifactBarProps, PinnedArtifactItem } from './PinnedArtifactBar';
