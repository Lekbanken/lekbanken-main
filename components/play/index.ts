/**
 * Play Sessions Components - Barrel Export
 *
 * Shared components for the Play Sessions MVP:
 * - Participant surfaces (/play/*)
 * - Host surfaces (/app/play/*)
 * - Admin surfaces (/admin/play/*)
 */

// Status badges
export { SessionStatusBadge, type SessionStatus } from './SessionStatusBadge';
export { ParticipantStatusBadge, ParticipantStatusDot } from './ParticipantStatusBadge';

// Participant components
export { ParticipantRow } from './ParticipantRow';
export { ParticipantList } from './ParticipantList';

// Session components
export { SessionCard, SessionCardSkeleton } from './SessionCard';
export { SessionListItem, SessionListItemSkeleton } from './SessionListItem';
export { SessionHeader } from './SessionHeader';
export { SessionControls } from './SessionControls';

// Form components
export { JoinSessionForm } from './JoinSessionForm';

// Feedback components
export { SessionStatusMessage, ReconnectingBanner } from './SessionFeedback';

// Immersion components (Sprint 1)
export { TypewriterText } from './TypewriterText';
export { CountdownOverlay } from './CountdownOverlay';

// Keypad components (Sprint 3)
export { Keypad } from './Keypad';
export { KeypadDisplay } from './KeypadDisplay';

// Trigger components (Sprint 4)
export { TriggerCard } from './TriggerCard';
export { TriggerList } from './TriggerList';
export { TriggerWizard } from './TriggerWizard';

// Lobby components (Sprint 4)
export { LobbyHub, LobbySectionCard } from './LobbyHub';
export { ReadinessBadge } from './ReadinessBadge';
export * from './lobby';

// Keypad components (Phase 2)
export { AlphaKeypad } from './AlphaKeypad';

// Story components (Phase 2)
export { StoryOverlay } from './StoryOverlay';

// Puzzle modules (Fas 1)
export { CounterDisplay, InteractiveCounter } from './Counter';
export { RiddleInput, useRiddle } from './RiddleInput';
export { AudioPlayer } from './AudioPlayer';

// Puzzle modules (Fas 2)
export { MultiAnswerForm } from './MultiAnswerForm';
export { QRScanner } from './QRScanner';
export { HintPanel, HintControl, useHintSystem } from './HintPanel';

// Puzzle modules (Fas 3)
export { HotspotImage, useHotspotGame } from './HotspotImage';
export { TilePuzzle, useTilePuzzle } from './TilePuzzle';
export { CipherDecoder, useCipherDecoder } from './CipherDecoder';

// Puzzle modules (Fas 4)
export { PropRequest, PropConfirmControl, usePropConfirmation } from './PropConfirmation';
export { LocationCheck, LocationConfirmControl, useLocationCheck } from './LocationCheck';

// Puzzle modules (Fas 5)
export { LogicGrid, useLogicGrid } from './LogicGrid';
export { SoundLevelMeter, useSoundLevel } from './SoundLevelMeter';
export { ReplayTimeline, useReplayMarkers } from './ReplayMarker';

// Hooks
export { useTypewriter } from './hooks/useTypewriter';
export { useCountdown } from './hooks/useCountdown';
export { useKeypad } from './hooks/useKeypad';
export { useTrigger } from './hooks/useTrigger';
export { useSound } from './hooks/useSound';
export type { TypewriterSpeed } from './hooks/useTypewriter';
export type { UseTriggerOptions, UseTriggerReturn } from './hooks/useTrigger';

