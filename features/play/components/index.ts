/**
 * Play Components
 * 
 * Export all components for the Play feature.
 */

// Basic Play Mode Components
export { SimplePlayView } from './SimplePlayView';
export type { SimplePlayViewProps } from './SimplePlayView';

// Facilitator components
export { FacilitatorDashboard } from './FacilitatorDashboard';
export type { FacilitatorDashboardProps } from './FacilitatorDashboard';

export { TimerControl } from './TimerControl';
export type { TimerControlProps } from './TimerControl';

export { StepPhaseNavigation } from './StepPhaseNavigation';
export type { StepPhaseNavigationProps, StepInfo, PhaseInfo } from './StepPhaseNavigation';

export { RoleAssigner } from './RoleAssigner';
export type { RoleAssignerProps } from './RoleAssigner';

export { RoleAssignerContainer } from './RoleAssignerContainer';
export type { RoleAssignerContainerProps } from './RoleAssignerContainer';

// Participant components
export { ParticipantPlayView } from './ParticipantPlayView';
export type { ParticipantPlayViewProps, StepData } from './ParticipantPlayView';

export { ParticipantFullscreenShell } from './ParticipantFullscreenShell';
export type { ParticipantFullscreenShellProps } from './ParticipantFullscreenShell';

export { ParticipantStepStage } from './ParticipantStepStage';
export type { ParticipantStepStageProps } from './ParticipantStepStage';

export { ParticipantOverlayStack } from './ParticipantOverlayStack';
export type { ParticipantOverlayStackProps, ActiveDrawer, OverlayState } from './ParticipantOverlayStack';

export { ParticipantArtifactDrawer } from './ParticipantArtifactDrawer';
export type { ParticipantArtifactDrawerProps } from './ParticipantArtifactDrawer';

export { ParticipantDecisionDrawer, ParticipantDecisionModal } from './ParticipantDecisionOverlay';
export type { ParticipantDecisionDrawerProps, ParticipantDecisionModalProps, DecisionState, DecisionActions } from './ParticipantDecisionOverlay';

export { ParticipantRoleSection } from './ParticipantRoleSection';
export type { ParticipantRoleSectionProps } from './ParticipantRoleSection';

export { RoleCard } from './RoleCard';
export type { RoleCardProps, RoleCardData } from './RoleCard';

// Integration components
export { HostPlayMode } from './HostPlayMode';
export type { HostPlayModeProps } from './HostPlayMode';

export { ActiveSessionShell } from './ActiveSessionShell';
export type { ActiveSessionRole, ActiveSessionShellProps } from './ActiveSessionShell';

export { ParticipantPlayMode } from './ParticipantPlayMode';
export type { ParticipantPlayModeProps } from './ParticipantPlayMode';

export { HostSessionWithPlayClient } from './HostSessionWithPlay';

export { ParticipantSessionWithPlayClient } from './ParticipantSessionWithPlay';

export { PreflightChecklist, buildPreflightItems } from './PreflightChecklist';
export type {
  PreflightChecklistProps,
  ChecklistItem,
  ChecklistItemStatus,
  SessionChecklistState,
} from './PreflightChecklist';

// Existing components
export { NavigationControls } from './NavigationControls';
export { SessionHeader } from './SessionHeader';
export { StepViewer } from './StepViewer';

// Trigger components
export { TriggerPanel } from './TriggerPanel';
export type { TriggerPanelProps } from './TriggerPanel';

// Puzzle artifact renderer
export { PuzzleArtifactRenderer } from './PuzzleArtifactRenderer';
export type { PuzzleArtifactRendererProps, PuzzleArtifactData, PuzzleState } from './PuzzleArtifactRenderer';

// Host puzzle management
export { PuzzleProgressPanel } from './PuzzleProgressPanel';
export type { PuzzleProgressPanelProps, PuzzleStatus } from './PuzzleProgressPanel';

export { PropConfirmationManager } from './PropConfirmationManager';
export type { PropConfirmationManagerProps, PropRequest } from './PropConfirmationManager';

// Session Cockpit (unified host experience)
export { SessionCockpit, useSessionCockpit } from './SessionCockpit';
export type { SessionCockpitProps } from './SessionCockpit';

export { DirectorModeDrawer } from './DirectorModeDrawer';
export type { DirectorModeDrawerProps } from './DirectorModeDrawer';

export { StoryViewModal } from './StoryViewModal';
export type { StoryViewModalProps } from './StoryViewModal';

// Signal components
export { SignalPresetEditor } from './SignalPresetEditor';
export type {
  SignalPresetEditorProps,
  SignalPreset,
  SignalType,
  SignalPattern,
  SignalStep,
} from './SignalPresetEditor';

export { SignalCapabilityTest } from './SignalCapabilityTest';
export type { SignalCapabilityTestProps } from './SignalCapabilityTest';

// TimeBank components
export { TimeBankRuleEditor, DEFAULT_TIMEBANK_CONFIG } from './TimeBankRuleEditor';
export type {
  TimeBankRuleEditorProps,
  TimeBankConfig,
  TimeBankRule,
  TimeBankRuleTrigger,
  TimeBankOperator,
} from './TimeBankRuleEditor';

export { TimeBankLivePanel } from './TimeBankLivePanel';
export type { TimeBankLivePanelProps } from './TimeBankLivePanel';

// Trigger debug & safety components
export { TriggerLivePanel } from './TriggerLivePanel';
export type { TriggerLivePanelProps } from './TriggerLivePanel';

export { TriggerKillSwitch } from './TriggerKillSwitch';
export type { TriggerKillSwitchProps } from './TriggerKillSwitch';

export { TriggerDryRunPanel } from './TriggerDryRunPanel';
export type { TriggerDryRunPanelProps, SimulationEvent, SimulationResult } from './TriggerDryRunPanel';

// Event system & observability
export { EventFeedPanel } from './EventFeedPanel';
export type { EventFeedPanelProps } from './EventFeedPanel';

// Keyboard shortcuts
export { ShortcutHelpPanel, KeyboardShortcutIndicator } from './ShortcutHelpPanel';
export type { ShortcutHelpPanelProps, KeyboardShortcutIndicatorProps } from './ShortcutHelpPanel';

// Readiness indicator (confidence meter)
export { ReadinessIndicator } from './ReadinessIndicator';
export type { ReadinessIndicatorProps } from './ReadinessIndicator';

// Trigger template library
export { TriggerTemplateLibrary } from './TriggerTemplateLibrary';
export type { TriggerTemplateLibraryProps } from './TriggerTemplateLibrary';

// Batch artifact operations
export { BatchArtifactPanel } from './BatchArtifactPanel';
export type { BatchArtifactPanelProps } from './BatchArtifactPanel';

// Director artifact actions (extracted from ArtifactsPanel)
export { DirectorArtifactActions } from './DirectorArtifactActions';
export type { DirectorArtifactActionsProps } from './DirectorArtifactActions';

// Artifact Inspector + Link Pills (PR #2)
export { ArtifactInspector } from './artifacts/ArtifactInspector';
export type { ArtifactInspectorProps, InspectorVariant } from './artifacts/ArtifactInspector';
export { ArtifactLinkPills } from './artifacts/ArtifactLinkPills';
export type { ArtifactLinkPillsProps } from './artifacts/ArtifactLinkPills';

// Artifact Timeline — Per-artifact event history (PR #3)
export { ArtifactTimeline } from './artifacts/ArtifactTimeline';
export type { ArtifactTimelineProps } from './artifacts/ArtifactTimeline';

// Pinned Artifact Bar — Quick-access strip (PR #4)
export { PinnedArtifactBar } from './artifacts/PinnedArtifactBar';
export type { PinnedArtifactBarProps, PinnedArtifactItem } from './artifacts/PinnedArtifactBar';

// Session timeline
export { SessionTimeline, CompactTimeline } from './SessionTimeline';
export type { SessionTimelineProps, CompactTimelineProps } from './SessionTimeline';

// Analytics dashboard
export { AnalyticsDashboard, AnalyticsSummaryCard } from './AnalyticsDashboard';
export type { AnalyticsDashboardProps, AnalyticsSummaryCardProps } from './AnalyticsDashboard';

// Multi-language leader script
export { LeaderScriptPanel, CompactScriptLine } from './LeaderScriptPanel';
export type { LeaderScriptPanelProps, CompactScriptLineProps } from './LeaderScriptPanel';
