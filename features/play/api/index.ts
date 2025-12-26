/**
 * Play API - Barrel Export
 */

export {
  getHostPlaySession,
  getParticipantPlaySession,
  updatePlaySessionState,
  type PlaySessionData,
  type ParticipantPlayData,
} from './session-api';

export {
  getParticipantArtifacts,
  getParticipantDecisions,
  castParticipantVote,
  getParticipantDecisionResults,
  submitKeypadCode,
  type ParticipantSessionArtifact,
  type ParticipantSessionArtifactVariant,
  type ParticipantDecision,
  type DecisionOption,
  type DecisionResultsResponse,
  type KeypadState,
  type SanitizedKeypadMetadata,
  type KeypadAttemptResponse,
} from './primitives-api';
