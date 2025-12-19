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
  type ParticipantSessionArtifact,
  type ParticipantSessionArtifactVariant,
  type ParticipantDecision,
  type DecisionOption,
  type DecisionResultsResponse,
} from './primitives-api';
