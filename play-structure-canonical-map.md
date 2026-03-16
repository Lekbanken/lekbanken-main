# Play Structure Canonical Map

> Generated 2026-03-16. Every play-related file classified.  
> Legend: **CAN** = canonical runtime, **ORP** = orphaned, **INT** = internal-only, **API** = API layer, **SRV** = server utility

---

## components/play/ — Shared UI Primitives (47 files)

### Status badges
| File | Status | Consumers |
|------|--------|-----------|
| `SessionStatusBadge.tsx` | **CAN** | Marketing play, features/play |
| `ParticipantStatusBadge.tsx` | **INT** | Internal dependency of ParticipantRow.tsx |

### Participant components
| File | Status | Consumers |
|------|--------|-----------|
| `ParticipantRow.tsx` | **CAN** | features/play (via barrel) |
| `ParticipantList.tsx` | **CAN** | App play sessions, features/play |

### Session components
| File | Status | Consumers |
|------|--------|-----------|
| `SessionCard.tsx` | **ORP** | Zero external references |
| `SessionListItem.tsx` | **CAN** | App play sessions list |
| `SessionHeader.tsx` | **CAN** | App play sessions, features/play (via barrel) — note: different component from features/play/SessionHeader |
| `SessionControls.tsx` | **CAN** | App play sessions, features/play |
| `SessionFeedback.tsx` | **CAN** | Exports `SessionStatusMessage`, `ReconnectingBanner` — heavily used |

### Form components
| File | Status | Consumers |
|------|--------|-----------|
| `JoinSessionForm.tsx` | **CAN** | Marketing play join, features/play, sandbox |

### Immersion components
| File | Status | Consumers |
|------|--------|-----------|
| `TypewriterText.tsx` | **CAN** | features/play, sandbox |
| `CountdownOverlay.tsx` | **CAN** | features/play, sandbox |
| `StoryOverlay.tsx` | **CAN** | features/play, sandbox |
| `Counter.tsx` | **CAN** | Sandbox artifacts |

### Keypad components
| File | Status | Consumers |
|------|--------|-----------|
| `Keypad.tsx` | **CAN** | features/play (PuzzleArtifactRenderer), sandbox |
| `KeypadDisplay.tsx` | **INT** | Only used by Keypad.tsx |
| `AlphaKeypad.tsx` | **CAN** | Sandbox |

### Trigger components
| File | Status | Consumers |
|------|--------|-----------|
| `TriggerCard.tsx` | **CAN** | Sandbox |
| `TriggerList.tsx` | **CAN** | Sandbox |
| `TriggerWizard.tsx` | **CAN** | Admin game builder |

### Lobby components
| File | Status | Consumers |
|------|--------|-----------|
| `LobbyHub.tsx` | **CAN** | Sandbox |
| `ReadinessBadge.tsx` | **CAN** | Sandbox |

### Lobby subdirectory
| File | Status | Consumers |
|------|--------|-----------|
| `lobby/ContentPreviewSection.tsx` | **CAN** | Sandbox (via barrel) |
| `lobby/ParticipantsSection.tsx` | **CAN** | Sandbox |
| `lobby/RolesSection.tsx` | **CAN** | Sandbox |
| `lobby/SettingsSection.tsx` | **CAN** | Sandbox |
| `lobby/index.ts` | **CAN** | Barrel export |

### Puzzle modules
| File | Status | Consumers |
|------|--------|-----------|
| `RiddleInput.tsx` | **CAN** | features/play, sandbox |
| `AudioPlayer.tsx` | **CAN** | features/play, sandbox |
| `MultiAnswerForm.tsx` | **CAN** | features/play, sandbox |
| `QRScanner.tsx` | **CAN** | features/play, sandbox |
| `HintPanel.tsx` | **CAN** | features/play, sandbox |
| `HotspotImage.tsx` | **CAN** | features/play, sandbox |
| `TilePuzzle.tsx` | **CAN** | features/play, sandbox |
| `CipherDecoder.tsx` | **CAN** | features/play, sandbox |
| `PropConfirmation.tsx` | **CAN** | features/play, sandbox |
| `LocationCheck.tsx` | **CAN** | features/play, sandbox |
| `LogicGrid.tsx` | **CAN** | features/play, sandbox |
| `SoundLevelMeter.tsx` | **CAN** | features/play, sandbox |
| `ReplayMarker.tsx` | **CAN** | features/play, sandbox |

### Hooks
| File | Status | Consumers |
|------|--------|-----------|
| `hooks/useTypewriter.ts` | **CAN** | Barrel export |
| `hooks/useCountdown.ts` | **CAN** | Barrel export |
| `hooks/useSound.ts` | **CAN** | Barrel export |
| `hooks/useTrigger.ts` | **CAN** | Sandbox |
| `hooks/useKeypad.ts` | **CAN** | Barrel export |
| `hooks/index.ts` | **CAN** | Barrel export |

### Barrel
| File | Status |
|------|--------|
| `index.ts` | **CAN** — primary import surface |

---

## features/play/ — Domain Orchestration (134 files)

### Top-level
| File | Status | Role |
|------|--------|------|
| `index.ts` | **CAN** | Barrel re-export |
| `api.ts` | **API** | Session API aggregator |
| `types.ts` | **CAN** | Domain types (Run, RunStep, RunStatus) |
| `PlayPage.tsx` | **CAN** | Play page component |
| `PlayPlanPage.tsx` | **CAN** | Plan-based play page |
| `haptics.ts` | **CAN** | Haptic feedback utility |
| `sound.ts` | **CAN** | Sound effect utility |

### API subdirectory
| File | Status | Role |
|------|--------|------|
| `api/session-api.ts` | **API** | Session CRUD + realtime |
| `api/chat-api.ts` | **API** | Chat operations |
| `api/signals-api.ts` | **API** | Signal system API |
| `api/primitives-api.ts` | **API** | Primitive operations |
| `api/time-bank-api.ts` | **API** | Time bank operations |
| `api/index.ts` | **API** | Barrel export |

### Components (82 files — all CAN unless noted)

**Play modes:** `HostPlayMode`, `ParticipantPlayMode`, `FacilitatedPlayView`, `BasicPlayView`, `SimplePlayView`

**Session shells:** `ActiveSessionShell`, `HostSessionWithPlay`, `ParticipantSessionWithPlay`, `ParticipantFullscreenShell`

**Session management:** `SessionCockpit`, `RunSessionCockpit`, `RunsDashboard`, `SessionHeader`, `SessionTimeline`, `SessionStoryPanel`

**Director mode (7):** `DirectorModePanel`, `DirectorModeDrawer`, `DirectorStagePanel`, `DirectorChipLane`, `DirectorTriggerCard`, `DirectorArtifactActions`

**Participant UI (11):** `ParticipantPlayView`, `ParticipantLobby`, `ParticipantOverlayStack`, `ParticipantStepStage`, `ParticipantDecisionOverlay`, `ParticipantDebugOverlay`, `ParticipantRoleSection`, `ParticipantSignalMicroUI`, `ParticipantTimeBankDisplay`, `ParticipantArtifactDrawer`, `ParticipantPlayMode`

**Chat/feedback:** `SessionChatDrawer`, `SessionChatModal`, `LeaveSessionModal`

**Navigation:** `NavigationControls`, `StepPhaseNavigation`, `StepViewer`

**Trigger system:** `TriggerPanel`, `TriggerLivePanel`, `TriggerDryRunPanel`, `TriggerKillSwitch`, `TriggerLane`, `TriggerTemplateLibrary`

**Signal system:** `SignalPanel`, `SignalPresetEditor`, `SignalCapabilityTest`

**Time bank:** `TimeBankPanel`, `TimeBankLivePanel`, `TimeBankRuleEditor`

**Artifacts:** `ArtifactsPanel`, `BatchArtifactPanel`, `PuzzleArtifactRenderer`, `PuzzleProgressPanel`, `ConversationCardsCollectionArtifact`, `ArtifactInspector`, `ArtifactLinkPills`, `ArtifactTimeline`, `PinnedArtifactBar`

**Shared subdir (18):** UI tokens, badges, layout primitives used within features/play only

**Other:** `AnalyticsDashboard`, `DecisionsPanel`, `EventFeedPanel`, `LeaderScriptPanel`, `OutcomePanel`, `PreflightChecklist`, `ReadinessIndicator`, `RoleAssigner`, `RoleAssignerContainer`, `RoleCard`, `ShortcutHelpPanel`, `StorylineModal`, `StoryViewModal`, `TimerControl`, `LobbySkeletons`, `PropConfirmationManager`

### Hooks (17 files — all CAN)

`useLiveSession`, `useSessionState`, `useSessionChat`, `useSessionEvents`, `useSessionTimeline`, `useSessionReadiness`, `useSessionAnalytics`, `useSessionAchievements`, `useTriggerEngine`, `useSignalCapabilities`, `usePlayBroadcast`, `usePuzzleRealtime`, `useBatchArtifacts`, `useDirectorShortcuts`, `useDrawerDiscipline`, `useMultiLanguageScript`, `withSignalAndTimeBank`

### Contracts
| File | Status | Role |
|------|--------|------|
| `contracts/participantCockpit.schema.ts` | **CAN** | Schema validation |
| `contracts/requestRateMonitor.ts` | **CAN** | Rate limiting |

### Utils
| File | Status | Role |
|------|--------|------|
| `utils/roleState.ts` | **CAN** | Role state management |
| `utils/signalCatalog.ts` | **CAN** | Signal catalog |
| `utils/signalHelpers.ts` | **CAN** | Signal utilities |
| `utils/index.ts` | **CAN** | Barrel export |

---

## features/play-participant/ — API Client (2 files)

| File | Status | Role |
|------|--------|------|
| `api.ts` | **API** | `joinSession`, `createSession`, `listHostSessions`, `approveParticipant`, `kickParticipant`, `setNextStarter` |
| `tokenStorage.ts` | **CAN** | Participant auth token persistence (`saveParticipantAuth`, `loadParticipantAuth`, `clearParticipantAuth`) |

---

## lib/play/ — Server Utilities (5 files)

| File | Status | Consumers |
|------|--------|-----------|
| `session-command.ts` | **SRV** | API routes (`/api/play/sessions/[id]/command`, `/api/play/sessions/[id]`), `features/play/api.ts` |
| `session-guards.ts` | **SRV** | 15+ API routes (assertSessionStatus) |
| `ui-state.ts` | **SRV** | Board client, participants view, SessionCockpit |
| `game-to-cockpit.ts` | **SRV** | Director preview client |
| `realtime-gate.ts` | **SRV** | features/play hooks |

---

## Orphaned Files Summary

| File | Tree | Action |
|------|------|--------|
| `components/play/SessionCard.tsx` | components/play | DELETE — zero consumers |
