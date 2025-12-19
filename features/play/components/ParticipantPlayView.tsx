/**
 * ParticipantPlayView Component
 * 
 * Main view for participants during a play session.
 * Shows current step, timer, role info, and board messages.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClockIcon,
  PauseCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  SignalSlashIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/solid';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLiveSession } from '@/features/play/hooks/useLiveSession';
import { useLiveTimer } from '@/features/play/hooks/useLiveSession';
import { formatTime, getTrafficLightColor } from '@/lib/utils/timer-utils';
import { RoleCard, type RoleCardData } from './RoleCard';
import type { TimerState, SessionRuntimeState } from '@/types/play-runtime';
import type { BoardTheme } from '@/types/games';
import {
  getSessionChatMessages,
  sendSessionChatMessage,
  type ChatMessage,
} from '@/features/play/api/chat-api';
import {
  getParticipantArtifacts,
  getParticipantDecisions,
  castParticipantVote,
  getParticipantDecisionResults,
  type ParticipantSessionArtifact,
  type ParticipantSessionArtifactVariant,
  type ParticipantDecision,
  type DecisionResultsResponse,
} from '@/features/play/api';

// =============================================================================
// Types
// =============================================================================

export interface StepData {
  id: string;
  title: string;
  description: string;
  durationMinutes?: number;
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
}

export interface ParticipantPlayViewProps {
  /** Session ID */
  sessionId: string;
  /** Game title */
  gameTitle: string;
  /** Steps data */
  steps: StepData[];
  /** Participant's assigned role (if any) */
  role?: RoleCardData;
  /** Initial state from server */
  initialState?: Partial<SessionRuntimeState>;
  /** Participant name */
  participantName?: string;
  /** Participant id (used for turn indicator) */
  participantId?: string;
  /** Initial next-starter state from server */
  isNextStarter?: boolean;
  /** Participant token (used for chat API) */
  participantToken?: string;
  /** Whether to show role card */
  showRole?: boolean;
  /** Board theme (from game board config) */
  boardTheme?: BoardTheme;
}

function getThemeAccentClasses(theme?: BoardTheme) {
  switch (theme) {
    case 'mystery':
      return { label: 'text-slate-200', badge: 'bg-slate-800 text-slate-50' };
    case 'party':
      return { label: 'text-pink-600', badge: 'bg-pink-600 text-white' };
    case 'sport':
      return { label: 'text-green-600', badge: 'bg-green-600 text-white' };
    case 'nature':
      return { label: 'text-emerald-700', badge: 'bg-emerald-700 text-white' };
    case 'neutral':
    default:
      return { label: 'text-primary', badge: 'bg-primary text-primary-foreground' };
  }
}

// =============================================================================
// Sub-components
// =============================================================================

interface TimerDisplayProps {
  timerState: TimerState | null;
}

function TimerDisplay({ timerState }: TimerDisplayProps) {
  const display = useLiveTimer({ timerState });
  
  if (!timerState) {
    return null;
  }
  
  const trafficColor = getTrafficLightColor(display);
  
  const colorClasses = {
    green: 'text-green-500 bg-green-50 border-green-200',
    yellow: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    red: 'text-red-500 bg-red-50 border-red-200',
  };
  
  const progressColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className={`rounded-2xl border-2 p-4 ${colorClasses[trafficColor]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          <span className="text-sm font-medium">
            {display.isPaused ? 'Timer pausad' : display.isFinished ? 'Tiden är slut!' : 'Tid kvar'}
          </span>
        </div>
        <span className="font-mono text-2xl font-bold tabular-nums">
          {formatTime(display.remaining)}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${progressColorClasses[trafficColor]}`}
          style={{ width: `${(1 - display.progress) * 100}%` }}
        />
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  status: SessionRuntimeState['status'];
  connected: boolean;
}

function StatusIndicator({ status, connected }: StatusIndicatorProps) {
  const statusConfig = {
    active: { icon: SignalIcon, text: 'Aktiv', color: 'text-green-500' },
    paused: { icon: PauseCircleIcon, text: 'Pausad', color: 'text-yellow-500' },
    ended: { icon: CheckCircleIcon, text: 'Avslutad', color: 'text-gray-500' },
    cancelled: { icon: ExclamationTriangleIcon, text: 'Avbruten', color: 'text-red-500' },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className="flex items-center gap-3">
      <Badge variant={connected ? 'default' : 'destructive'} className="gap-1">
        {connected ? (
          <SignalIcon className="h-3 w-3" />
        ) : (
          <SignalSlashIcon className="h-3 w-3" />
        )}
        {connected ? 'Live' : 'Offline'}
      </Badge>
      
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    </div>
  );
}

interface BoardMessageProps {
  message?: string;
}

function BoardMessage({ message }: BoardMessageProps) {
  if (!message) return null;
  
  return (
    <Card className="border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <ChatBubbleBottomCenterTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ParticipantPlayView({
  sessionId,
  gameTitle,
  steps,
  role,
  initialState,
  participantName,
  participantId,
  isNextStarter: initialIsNextStarter,
  participantToken,
  showRole = true,
  boardTheme,
}: ParticipantPlayViewProps) {
  // --------------------------------------------------------------------------
  // Primitives (participant): Artifacts + Decisions
  // --------------------------------------------------------------------------

  const [artifacts, setArtifacts] = useState<ParticipantSessionArtifact[]>([]);
  const [artifactVariants, setArtifactVariants] = useState<ParticipantSessionArtifactVariant[]>([]);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  const [decisions, setDecisions] = useState<ParticipantDecision[]>([]);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);
  const [selectedOptionByDecisionId, setSelectedOptionByDecisionId] = useState<Record<string, string>>({});
  const [voteSendingByDecisionId, setVoteSendingByDecisionId] = useState<Record<string, boolean>>({});
  const [voteMessageByDecisionId, setVoteMessageByDecisionId] = useState<Record<string, string | null>>({});
  const [resultsByDecisionId, setResultsByDecisionId] = useState<Record<string, DecisionResultsResponse | null>>({});

  const loadArtifacts = useCallback(async () => {
    if (!participantToken) return;
    try {
      const data = await getParticipantArtifacts(sessionId, { participantToken });
      setArtifacts(data.artifacts);
      setArtifactVariants(data.variants);
      setArtifactsError(null);
    } catch (err) {
      setArtifactsError(err instanceof Error ? err.message : 'Kunde inte ladda artefakter');
    }
  }, [sessionId, participantToken]);

  const loadDecisions = useCallback(async () => {
    if (!participantToken) return;
    try {
      const list = await getParticipantDecisions(sessionId, { participantToken });
      setDecisions(list);
      setDecisionsError(null);

      // Fetch results for revealed decisions (best-effort)
      const revealed = list.filter((d) => d.status === 'revealed');
      if (revealed.length > 0) {
        const entries = await Promise.all(
          revealed.map(async (d) => {
            try {
              const res = await getParticipantDecisionResults(sessionId, d.id, { participantToken });
              return [d.id, res] as const;
            } catch {
              return [d.id, null] as const;
            }
          })
        );
        setResultsByDecisionId((prev) => {
          const next = { ...prev };
          for (const [id, res] of entries) next[id] = res;
          return next;
        });
      }
    } catch (err) {
      setDecisionsError(err instanceof Error ? err.message : 'Kunde inte ladda beslut');
    }
  }, [sessionId, participantToken]);

  // Subscribe to live session updates
  const {
    currentStepIndex,
    currentPhaseIndex: _currentPhaseIndex,
    status,
    timerState,
    boardState,
    nextStarterParticipantId,
    connected,
  } = useLiveSession({
    sessionId,
    initialState,
    onArtifactUpdate: () => {
      void loadArtifacts();
    },
    onDecisionUpdate: () => {
      void loadDecisions();
    },
  });
  
  // Current step data
  const currentStep = steps[currentStepIndex] || null;
  const totalSteps = steps.length;
  
  // Session is paused
  const isPaused = status === 'paused';
  const isEnded = status === 'ended' || status === 'cancelled';

  const themeAccent = getThemeAccentClasses(boardTheme);

  const isNextStarter = Boolean(
    participantId && nextStarterParticipantId
      ? nextStarterParticipantId === participantId
      : initialIsNextStarter
  );

  // --------------------------------------------------------------------------
  // Chat (participant)
  // --------------------------------------------------------------------------

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatTarget, setChatTarget] = useState<'public' | 'host'>('public');
  const [chatAnonymous, setChatAnonymous] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const latestChatTimestamp = useMemo(() => {
    if (chatMessages.length === 0) return undefined;
    return chatMessages[chatMessages.length - 1]?.createdAt;
  }, [chatMessages]);

  useEffect(() => {
    if (!participantToken) return;
    if (isEnded) return;
    void loadArtifacts();
    void loadDecisions();
  }, [participantToken, isEnded, loadArtifacts, loadDecisions]);

  const variantsByArtifactId = useMemo(() => {
    const map = new Map<string, ParticipantSessionArtifactVariant[]>();
    for (const v of artifactVariants) {
      const aId = v.session_artifact_id;
      if (!aId) continue;
      const list = map.get(aId) ?? [];
      list.push(v);
      map.set(aId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.variant_order ?? 0) - (b.variant_order ?? 0));
    }
    return map;
  }, [artifactVariants]);

  const handleVote = async (decisionId: string) => {
    if (!participantToken) return;
    const optionKey = selectedOptionByDecisionId[decisionId];
    if (!optionKey) {
      setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: 'Välj ett alternativ först.' }));
      return;
    }

    setVoteSendingByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
    setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: null }));
    try {
      await castParticipantVote(sessionId, decisionId, { optionKey }, { participantToken });
      setVoteMessageByDecisionId((prev) => ({ ...prev, [decisionId]: 'Röst mottagen!' }));
      // Refresh decisions (e.g. host might close/reveal)
      void loadDecisions();
    } catch (err) {
      setVoteMessageByDecisionId((prev) => ({
        ...prev,
        [decisionId]: err instanceof Error ? err.message : 'Kunde inte rösta',
      }));
    } finally {
      setVoteSendingByDecisionId((prev) => ({ ...prev, [decisionId]: false }));
    }
  };

  useEffect(() => {
    if (!participantToken) return;
    let cancelled = false;

    const loadInitial = async () => {
      try {
        const messages = await getSessionChatMessages(sessionId, { participantToken });
        if (!cancelled) {
          setChatMessages(messages);
          setChatError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setChatError(err instanceof Error ? err.message : 'Kunde inte ladda chatten');
        }
      }
    };

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, [sessionId, participantToken]);

  useEffect(() => {
    if (!participantToken) return;

    const interval = window.setInterval(async () => {
      try {
        const messages = await getSessionChatMessages(sessionId, {
          participantToken,
          since: latestChatTimestamp,
        });
        if (messages.length > 0) {
          setChatMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const next = [...prev];
            for (const m of messages) {
              if (!seen.has(m.id)) next.push(m);
            }
            return next.slice(-200);
          });
        }
      } catch {
        // best-effort polling
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [sessionId, participantToken, latestChatTimestamp]);

  const handleSendChat = async () => {
    if (!participantToken) return;
    const msg = chatInput.trim();
    if (!msg) return;

    setChatSending(true);
    setChatError(null);
    try {
      await sendSessionChatMessage(
        sessionId,
        {
          message: msg,
          visibility: chatTarget,
          anonymous: chatTarget === 'host' ? chatAnonymous : false,
        },
        { participantToken }
      );
      setChatInput('');
      setChatAnonymous(false);

      // Pull immediately to reflect the new message (avoid relying only on polling)
      const messages = await getSessionChatMessages(sessionId, {
        participantToken,
        since: latestChatTimestamp,
      });
      if (messages.length > 0) {
        setChatMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const next = [...prev];
          for (const m of messages) {
            if (!seen.has(m.id)) next.push(m);
          }
          return next.slice(-200);
        });
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Kunde inte skicka meddelandet');
    } finally {
      setChatSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pb-24">
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-bold uppercase tracking-widest ${themeAccent.label}`}>Spela</p>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">{gameTitle}</h1>
          </div>
          <StatusIndicator status={status} connected={connected} />
        </div>
        
        {participantName && (
          <p className="text-sm text-muted-foreground">
            Du spelar som <span className="font-medium text-foreground">{participantName}</span>
          </p>
        )}
      </header>
      
      {/* Board Message */}
      <BoardMessage message={boardState?.message} />

      {/* Turn Indicator */}
      {isNextStarter && !isEnded && (
        <Card className="border-2 border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">Du börjar nästa!</p>
        </Card>
      )}

      {/* Chat */}
      {!isEnded && participantToken && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Chatt</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={chatTarget === 'public' ? 'primary' : 'outline'}
                onClick={() => setChatTarget('public')}
              >
                Till alla
              </Button>
              <Button
                type="button"
                size="sm"
                variant={chatTarget === 'host' ? 'primary' : 'outline'}
                onClick={() => setChatTarget('host')}
              >
                Privat till lekledare
              </Button>
            </div>
          </div>

          {chatTarget === 'host' && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={chatAnonymous}
                onChange={(e) => setChatAnonymous(e.target.checked)}
              />
              Skicka anonymt
            </label>
          )}

          <div className="max-h-64 overflow-auto rounded-md border border-border p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Inga meddelanden ännu.</p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{m.senderLabel}</span>
                    {m.visibility === 'host' && (
                      <Badge variant="secondary">Privat</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{m.message}</p>
                </div>
              ))
            )}
          </div>

          {chatError && <p className="text-sm text-destructive">{chatError}</p>}

          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={chatTarget === 'public' ? 'Skriv till alla…' : 'Skriv privat till lekledaren…'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSendChat();
                }
              }}
              disabled={chatSending}
            />
            <Button type="button" onClick={() => void handleSendChat()} disabled={chatSending}>
              Skicka
            </Button>
          </div>
        </Card>
      )}

      {/* My Artifacts */}
      {!isEnded && participantToken && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Mina artefakter</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadArtifacts()}>
              Uppdatera
            </Button>
          </div>

          {artifactsError && <p className="text-sm text-destructive">{artifactsError}</p>}

          {artifacts.length === 0 || artifactVariants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga artefakter just nu.</p>
          ) : (
            <div className="space-y-3">
              {artifacts
                .slice()
                .sort((a, b) => (a.artifact_order ?? 0) - (b.artifact_order ?? 0))
                .map((a) => {
                  const vars = variantsByArtifactId.get(a.id) ?? [];
                  if (vars.length === 0) return null;
                  return (
                    <div key={a.id} className="rounded-md border border-border p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">{a.title ?? 'Artefakt'}</p>
                      <div className="space-y-2">
                        {vars.map((v) => {
                          const visibility = v.visibility ?? 'public';
                          const isPublicRevealed = visibility === 'public' && Boolean(v.revealed_at);
                          const isHighlighted = Boolean(v.highlighted_at);

                          return (
                            <div key={v.id} className="rounded-md bg-muted/30 p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{v.title ?? 'Kort'}</p>
                                {isPublicRevealed ? (
                                  <Badge variant="secondary">Offentlig</Badge>
                                ) : visibility === 'role_private' ? (
                                  <Badge variant="secondary">Roll</Badge>
                                ) : (
                                  <Badge variant="secondary">Privat</Badge>
                                )}
                                {isHighlighted && <Badge variant="default">Markerad</Badge>}
                              </div>
                              {v.body && <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}

      {/* Decisions */}
      {!isEnded && participantToken && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Beslut</p>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadDecisions()}>
              Uppdatera
            </Button>
          </div>

          {decisionsError && <p className="text-sm text-destructive">{decisionsError}</p>}

          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga beslut just nu.</p>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => {
                const selected = selectedOptionByDecisionId[d.id] ?? '';
                const sending = Boolean(voteSendingByDecisionId[d.id]);
                const msg = voteMessageByDecisionId[d.id];
                const options = d.options ?? [];
                const isOpen = d.status === 'open';
                const isRevealed = d.status === 'revealed';
                const results = resultsByDecisionId[d.id]?.results ?? null;

                return (
                  <div key={d.id} className="rounded-md border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{d.title}</p>
                        {d.prompt && <p className="text-sm text-muted-foreground">{d.prompt}</p>}
                      </div>
                      <Badge variant={isOpen ? 'default' : 'secondary'}>{d.status}</Badge>
                    </div>

                    {isOpen && options.length > 0 && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          {options.map((o) => (
                            <label key={o.key} className="flex items-center gap-2 text-sm">
                              <input
                                type="radio"
                                name={`decision-${d.id}`}
                                value={o.key}
                                checked={selected === o.key}
                                onChange={() =>
                                  setSelectedOptionByDecisionId((prev) => ({ ...prev, [d.id]: o.key }))
                                }
                                disabled={sending}
                              />
                              <span className="text-foreground">{o.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleVote(d.id)}
                            disabled={sending}
                          >
                            Rösta
                          </Button>
                          {msg && (
                            <p className={`text-sm ${msg.includes('!') ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {msg}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {isRevealed && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Resultat:</p>
                        {results ? (
                          <div className="space-y-1">
                            {results.map((r) => (
                              <div key={r.key ?? r.label} className="flex items-center justify-between text-sm">
                                <span className="text-foreground">{r.label ?? r.key}</span>
                                <span className="text-muted-foreground">{r.count}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Resultaten är visade.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
      
      {/* Pause Overlay */}
      {isPaused && (
        <Card className="border-2 border-yellow-200 bg-yellow-50 p-6 text-center dark:bg-yellow-900/20">
          <PauseCircleIcon className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-3 text-lg font-semibold text-yellow-700 dark:text-yellow-400">
            Sessionen är pausad
          </h2>
          <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-500">
            Vänta på att ledaren startar igen
          </p>
        </Card>
      )}
      
      {/* Ended State */}
      {isEnded && (
        <Card className="border-2 border-gray-200 bg-gray-50 p-6 text-center dark:bg-gray-800/50">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-3 text-lg font-semibold text-gray-700 dark:text-gray-300">
            Sessionen är avslutad
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Tack för att du deltog!
          </p>
        </Card>
      )}
      
      {/* Timer */}
      {!isEnded && (
        <TimerDisplay timerState={timerState} />
      )}
      
      {/* Current Step */}
      {currentStep && !isEnded && (
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${themeAccent.badge}`}>
                  {currentStepIndex + 1}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Steg {currentStepIndex + 1} av {totalSteps}
                </span>
              </div>
              {currentStep.tag && (
                <Badge variant="default">{currentStep.tag}</Badge>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{currentStep.title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{currentStep.description}</p>
            
            {/* Materials */}
            {currentStep.materials && currentStep.materials.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Material
                </p>
                <ul className="space-y-1 text-sm">
                  {currentStep.materials.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Safety note */}
            {currentStep.safety && (
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                      Säkerhet
                    </p>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {currentStep.safety}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Note */}
            {currentStep.note && (
              <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                💡 {currentStep.note}
              </p>
            )}
          </div>
        </Card>
      )}
      
      {/* Step Progress Dots */}
      {!isEnded && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === currentStepIndex
                    ? 'bg-primary scale-125'
                    : i < currentStepIndex
                      ? 'bg-primary/40'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Role Card */}
      {showRole && role && !isEnded && (
        <div className="pt-4">
          <RoleCard role={role} variant="full" showPrivate={true} />
        </div>
      )}
    </div>
  );
}
