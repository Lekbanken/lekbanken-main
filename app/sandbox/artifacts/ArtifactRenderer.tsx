'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Keypad } from '@/components/play/Keypad';
import { RiddleInput } from '@/components/play/RiddleInput';
import { CipherDecoder } from '@/components/play/CipherDecoder';
import { HotspotImage } from '@/components/play/HotspotImage';
import { TilePuzzle } from '@/components/play/TilePuzzle';
import { LogicGrid } from '@/components/play/LogicGrid';
import { QRScanner } from '@/components/play/QRScanner';
import { HintPanel, HintControl } from '@/components/play/HintPanel';
import { AudioPlayer } from '@/components/play/AudioPlayer';
import { LocationCheck } from '@/components/play/LocationCheck';
import { PropRequest, PropConfirmControl } from '@/components/play/PropConfirmation';
import { ReplayTimeline } from '@/components/play/ReplayMarker';
import { SoundLevelMeter } from '@/components/play/SoundLevelMeter';
import { MultiAnswerForm } from '@/components/play/MultiAnswerForm';
import { CounterDisplay, InteractiveCounter } from '@/components/play/Counter';
import type { SandboxArtifactScenario } from './registry';
import type { SandboxArtifactScenarioId } from './registry';
import type {
  AudioConfig,
  CipherConfig,
  HintConfig,
  HintState,
  HotspotConfig,
  LocationCheckConfig,
  LogicGridCell,
  LogicGridConfig,
  MultiAnswerConfig,
  PropConfirmationConfig,
  ReplayMarkerConfig,
  RiddleConfig,
  ScanGateConfig,
  SoundLevelConfig,
  TilePuzzleConfig,
  CounterConfig,
} from '@/types/puzzle-modules';
import { isLogicGridSolved, isTilePuzzleSolved } from '@/types/puzzle-modules';
import type { ArtifactRole } from './schemas';
import { useSandboxArtifactRuntimeStore } from './runtime-store';
import type { SandboxArtifactRuntimeState } from './initial-state';

type Props = {
  scenario: SandboxArtifactScenario;
  role: ArtifactRole;
  // Optional config override (e.g. from future admin form)
  configOverride?: unknown;
};

function safeParseConfig(scenario: SandboxArtifactScenario, configOverride: unknown) {
  const input = configOverride ?? scenario.defaultConfig;
  const parsed = scenario.configSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, config: parsed.data };
  return { ok: false as const, error: parsed.error.flatten() };
}

type ReplayMarkerRuntimeState = Extract<SandboxArtifactRuntimeState, { kind: 'replay_marker' }>;

type ReplayMarkerArtifactCardProps = {
  role: ArtifactRole;
  scenarioId: SandboxArtifactScenarioId;
  replayConfig: ReplayMarkerConfig;
  runtime: ReplayMarkerRuntimeState;
  updateRuntimeState: (
    scenarioId: SandboxArtifactScenarioId,
    updater: (prev: SandboxArtifactRuntimeState) => SandboxArtifactRuntimeState
  ) => void;
  log: (
    type: 'config_updated' | 'state_updated' | 'reset' | 'solved' | 'failed' | 'revealed' | 'custom',
    payload?: Record<string, unknown>
  ) => void;
};

function ReplayMarkerArtifactCard({
  role,
  scenarioId,
  replayConfig,
  runtime,
  updateRuntimeState,
  log,
}: ReplayMarkerArtifactCardProps) {
  const [time, setTime] = useState(30);

  return (
    <Card className="p-4 space-y-4">
      <div className="text-sm text-muted-foreground">{role.toUpperCase()} • replay_marker</div>
      <ReplayTimeline
        config={replayConfig}
        state={runtime.state}
        sessionDurationSeconds={300}
        currentTimeSeconds={time}
        onAddMarker={(marker) =>
          updateRuntimeState(scenarioId, (prevRuntime) => {
            if (prevRuntime.kind !== 'replay_marker') return prevRuntime;
            const id = `marker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            log('revealed', {
              artifactType: 'replay_marker',
              action: 'marker_added',
              markerType: marker.type,
            });
            return {
              kind: 'replay_marker',
              state: {
                markers: [
                  ...prevRuntime.state.markers,
                  {
                    ...marker,
                    id,
                    createdAt: new Date().toISOString(),
                  },
                ],
              },
            };
          })
        }
        onDeleteMarker={(markerId) =>
          updateRuntimeState(scenarioId, (prevRuntime) => {
            if (prevRuntime.kind !== 'replay_marker') return prevRuntime;
            log('custom', { action: 'marker_deleted', artifactType: 'replay_marker', markerId });
            return {
              kind: 'replay_marker',
              state: { markers: prevRuntime.state.markers.filter((m) => m.id !== markerId) },
            };
          })
        }
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setTime((t) => Math.max(0, t - 10))}>
          -10s
        </Button>
        <Button variant="outline" size="sm" onClick={() => setTime((t) => Math.min(300, t + 10))}>
          +10s
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">t={time}s</div>
      </div>
    </Card>
  );
}

export function ArtifactRenderer({ scenario, role, configOverride }: Props) {
  const addEvent = useSandboxArtifactRuntimeStore((s) => s.addEvent);
  const runtime = useSandboxArtifactRuntimeStore((s) => s.runtimeStates[scenario.id]);
  const updateRuntimeState = useSandboxArtifactRuntimeStore((s) => s.updateRuntimeState);
  const resetScenario = useSandboxArtifactRuntimeStore((s) => s.resetScenario);

  const log = (type: 'config_updated' | 'state_updated' | 'reset' | 'solved' | 'failed' | 'revealed' | 'custom', payload?: Record<string, unknown>) =>
    addEvent({
      scenarioId: scenario.id,
      role,
      type,
      payload,
    });

  const stateMismatch = (expectedKind: SandboxArtifactRuntimeState['kind']) => (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Runtime state mismatch</div>
      <div className="text-sm text-muted-foreground">
        Expected <span className="font-mono">{expectedKind}</span>, got{' '}
        <span className="font-mono">{runtime?.kind ?? 'undefined'}</span>.
      </div>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => resetScenario(scenario.id)}>
          Återställ scenario
        </Button>
      </div>
    </Card>
  );

  const parsed = useMemo(
    () => safeParseConfig(scenario, configOverride),
    [scenario, configOverride]
  );

  if (!parsed.ok) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">Ogiltig config</div>
        <pre className="text-xs overflow-auto whitespace-pre-wrap text-muted-foreground">
          {JSON.stringify(parsed.error, null, 2)}
        </pre>
      </Card>
    );
  }

  const config: unknown = parsed.config;

  // Generic content renderers (card/document/image)
  if (scenario.artifactType === 'card' || scenario.artifactType === 'document') {
    const cardConfig = config as { title: string; body: string };
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm text-muted-foreground">
          {role.toUpperCase()} • {scenario.artifactType}
        </div>
        <div className="text-lg font-semibold">{cardConfig.title}</div>
        <div className="text-sm whitespace-pre-wrap">{cardConfig.body}</div>
      </Card>
    );
  }

  if (scenario.artifactType === 'image') {
    const imageConfig = config as {
      title: string;
      imageUrl: string;
      description?: string;
    };
    return (
      <Card className="p-4 space-y-3">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • image</div>
        <div className="text-lg font-semibold">{imageConfig.title}</div>
        {imageConfig.description && <div className="text-sm">{imageConfig.description}</div>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageConfig.imageUrl}
          alt={imageConfig.title}
          className="w-full h-auto rounded-lg"
        />
      </Card>
    );
  }

  if (scenario.artifactType === 'empty_artifact') {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Tom artefakt (placeholder)
      </Card>
    );
  }

  // Keypad is self-managed
  if (scenario.artifactType === 'keypad') {
    const keypadConfig = config as {
      correctCode: string;
      codeLength?: number;
      maxAttempts?: number;
      showAttempts?: boolean;
      cooldownMs?: number;
      hapticEnabled?: boolean;
      title?: string;
      size?: 'sm' | 'md' | 'lg';
      autoSubmit?: boolean;
    };

    if (!runtime || runtime.kind !== 'keypad') return stateMismatch('keypad');
    const solved = runtime.state.isSolved;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • keypad</div>
        {solved && (
          <div className="text-sm text-green-600">✅ Solved event (sandbox)</div>
        )}
        <Keypad
          correctCode={keypadConfig.correctCode}
          codeLength={keypadConfig.codeLength}
          maxAttempts={keypadConfig.maxAttempts}
          showAttempts={keypadConfig.showAttempts}
          cooldownMs={keypadConfig.cooldownMs}
          hapticEnabled={keypadConfig.hapticEnabled}
          title={keypadConfig.title}
          size={keypadConfig.size}
          autoSubmit={keypadConfig.autoSubmit}
          onSuccess={() => {
            updateRuntimeState(scenario.id, (prev) =>
              prev.kind === 'keypad' ? { kind: 'keypad', state: { isSolved: true } } : prev
            );
            log('solved', { artifactType: 'keypad' });
          }}
        />
        {role === 'participant' && !solved && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prev) =>
                  prev.kind === 'keypad' ? { kind: 'keypad', state: { isSolved: true } } : prev
                );
                log('solved', { artifactType: 'keypad', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'riddle') {
    const riddleConfig = config as RiddleConfig;
    if (!runtime || runtime.kind !== 'riddle') return stateMismatch('riddle');
    const solved = runtime.state.isCorrect;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • riddle</div>
        {solved && <div className="text-sm text-green-600">✅ Solved event (sandbox)</div>}
        <RiddleInput
          config={riddleConfig}
          onCorrect={() => {
            updateRuntimeState(scenario.id, (prev) => {
              if (prev.kind !== 'riddle') return prev;
              return {
                kind: 'riddle',
                state: {
                  ...prev.state,
                  isCorrect: true,
                  correctAnswer:
                    prev.state.correctAnswer ?? (riddleConfig.acceptedAnswers?.[0] ?? undefined),
                },
              };
            });
            log('solved', { artifactType: 'riddle' });
          }}
        />
        {role === 'participant' && !solved && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prev) => {
                  if (prev.kind !== 'riddle') return prev;
                  return {
                    kind: 'riddle',
                    state: {
                      ...prev.state,
                      isCorrect: true,
                      correctAnswer:
                        prev.state.correctAnswer ?? (riddleConfig.acceptedAnswers?.[0] ?? undefined),
                    },
                  };
                });
                log('solved', { artifactType: 'riddle', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'cipher') {
    const cipherConfig = config as CipherConfig;
    if (!runtime || runtime.kind !== 'cipher') return stateMismatch('cipher');
    const state = runtime.state;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • cipher</div>
        <CipherDecoder
          config={cipherConfig}
          state={state}
          onGuess={(guess) => {
            updateRuntimeState(scenario.id, (prev) => {
              if (prev.kind !== 'cipher') return prev;
              return {
                kind: 'cipher',
                state: {
                  ...prev.state,
                  currentGuess: guess,
                  attemptsUsed: prev.state.attemptsUsed + 1,
                },
              };
            });
            log('custom', { action: 'guess', artifactType: 'cipher', guessLength: guess.length });
          }}
          onDecoded={() => {
            updateRuntimeState(scenario.id, (prev) => {
              if (prev.kind !== 'cipher') return prev;
              return {
                kind: 'cipher',
                state: {
                  ...prev.state,
                  isDecoded: true,
                  decodedAt: new Date().toISOString(),
                },
              };
            });
            log('solved', { artifactType: 'cipher' });
          }}
        />
        {role === 'participant' && !state.isDecoded && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prev) => {
                  if (prev.kind !== 'cipher') return prev;
                  return {
                    kind: 'cipher',
                    state: {
                      ...prev.state,
                      isDecoded: true,
                      decodedAt: new Date().toISOString(),
                    },
                  };
                });
                log('solved', { artifactType: 'cipher', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'qr_gate') {
    const scanConfig = config as ScanGateConfig;
    if (!runtime || runtime.kind !== 'qr_gate') return stateMismatch('qr_gate');
    const state = runtime.state;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • qr_gate</div>
        <QRScanner
          config={scanConfig}
          state={state}
          onChange={(s) =>
            updateRuntimeState(scenario.id, (prev) =>
              prev.kind === 'qr_gate' ? { kind: 'qr_gate', state: s } : prev
            )
          }
          onSuccess={() => {
            log('solved', { artifactType: 'qr_gate' });
          }}
          onScanFail={() => {
            log('failed', { artifactType: 'qr_gate' });
          }}
        />
        {role === 'participant' && !state.isVerified && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prev) => {
                  if (prev.kind !== 'qr_gate') return prev;
                  return {
                    kind: 'qr_gate',
                    state: {
                      ...prev.state,
                      isVerified: true,
                      usedFallback: true,
                    },
                  };
                });
                log('solved', { artifactType: 'qr_gate', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'hint_container') {
    const hintConfig = config as HintConfig;
    if (!runtime || runtime.kind !== 'hint_container') return stateMismatch('hint_container');
    const state = runtime.state;

    const requestHint = (hintId: string) => {
      const hint = hintConfig.hints.find((h) => h.id === hintId);
      if (!hint) return;

      log('revealed', { artifactType: 'hint_container', hintId, cost: hint.cost });

      updateRuntimeState(scenario.id, (prevRuntime) => {
        if (prevRuntime.kind !== 'hint_container') return prevRuntime;
        const prev = prevRuntime.state;

        const already = prev.revealedHintIds.includes(hintId);
        if (already) return prevRuntime;

        const cooldownSeconds = hintConfig.cooldownSeconds ?? 0;
        const next: HintState = {
          ...prev,
          revealedHintIds: [...prev.revealedHintIds, hintId],
          lastHintTime: new Date().toISOString(),
          cooldownRemaining: cooldownSeconds,
          hintsAvailable: Math.max(0, prev.hintsAvailable - 1),
          totalPenaltyTime:
            prev.totalPenaltyTime + (hint.cost === 'time' ? hint.timePenalty ?? 0 : 0),
          totalPenaltyPoints:
            prev.totalPenaltyPoints + (hint.cost === 'points' ? hint.pointsPenalty ?? 0 : 0),
        };

        return { kind: 'hint_container', state: next };
      });
    };

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • hint_container</div>

        {role === 'host' || role === 'admin' ? (
          <HintControl
            config={hintConfig}
            state={state}
            onSendHint={requestHint}
            onSendCustomHint={(content) => {
              const id = `custom-${Date.now()}`;
              // Sandbox-only: append custom hint into config is out-of-scope here.
              // Instead, reveal it as a pseudo-hint.
              updateRuntimeState(scenario.id, (prevRuntime) => {
                if (prevRuntime.kind !== 'hint_container') return prevRuntime;
                return {
                  kind: 'hint_container',
                  state: {
                    ...prevRuntime.state,
                    revealedHintIds: [...prevRuntime.state.revealedHintIds, id],
                  },
                };
              });
              log('revealed', { artifactType: 'hint_container', hintId: id, custom: true });
              console.log('Custom hint:', content);
            }}
          />
        ) : (
          <HintPanel config={hintConfig} state={state} onRequestHint={requestHint} />
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'hotspot') {
    const hotspotConfig = config as HotspotConfig;
    const requiredHotspots = hotspotConfig.hotspots.filter((h) => h.required !== false);
    const requiredCount = hotspotConfig.requireAll ? requiredHotspots.length : requiredHotspots.length;

    if (!runtime || runtime.kind !== 'hotspot') return stateMismatch('hotspot');
    const state = runtime.state;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • hotspot</div>
        <HotspotImage
          config={hotspotConfig}
          state={state}
          onHotspotFound={(hotspotId) =>
            updateRuntimeState(scenario.id, (prevRuntime) => {
              if (prevRuntime.kind !== 'hotspot') return prevRuntime;
              const prev = prevRuntime.state;
              if (prev.foundHotspotIds.includes(hotspotId)) return prevRuntime;
              const foundHotspotIds = [...prev.foundHotspotIds, hotspotId];
              const foundCount = foundHotspotIds.length;
              const isComplete = foundCount >= requiredCount;
              log('revealed', { artifactType: 'hotspot', hotspotId, foundCount, requiredCount });
              if (isComplete && !prev.isComplete) {
                log('solved', { artifactType: 'hotspot' });
              }
              return {
                kind: 'hotspot',
                state: { ...prev, foundHotspotIds, foundCount, isComplete },
              };
            })
          }
        />
        {role === 'participant' && !state.isComplete && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'hotspot') return prevRuntime;
                  return {
                    kind: 'hotspot',
                    state: {
                      ...prevRuntime.state,
                      isComplete: true,
                      foundCount: prevRuntime.state.requiredCount,
                      foundHotspotIds: hotspotConfig.hotspots.map((h) => h.id),
                    },
                  };
                });
                log('solved', { artifactType: 'hotspot', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'tile_puzzle') {
    const tileConfig = config as TilePuzzleConfig;

    if (!runtime || runtime.kind !== 'tile_puzzle') return stateMismatch('tile_puzzle');
    const state = runtime.state;

    const handleMove = (tileId: string, newPosition: { row: number; col: number }) => {
      updateRuntimeState(scenario.id, (prevRuntime) => {
        if (prevRuntime.kind !== 'tile_puzzle') return prevRuntime;
        const prev = prevRuntime.state;
        const tiles = prev.tiles.map((t) =>
          t.id === tileId ? { ...t, currentPosition: newPosition } : t
        );
        const isComplete = isTilePuzzleSolved(tiles);
        if (isComplete && !prev.isComplete) {
          log('solved', { artifactType: 'tile_puzzle', moveCount: prev.moveCount + 1 });
        } else {
          log('custom', { action: 'tile_moved', artifactType: 'tile_puzzle' });
        }
        return {
          kind: 'tile_puzzle',
          state: {
            ...prev,
            tiles,
            isComplete,
            completedAt: isComplete ? new Date().toISOString() : prev.completedAt,
            moveCount: prev.moveCount + 1,
          },
        };
      });
    };

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • tile_puzzle</div>
        <TilePuzzle config={tileConfig} state={state} onTileMove={handleMove} />
        <div className="flex justify-end gap-2">
          {role === 'participant' && !state.isComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'tile_puzzle') return prevRuntime;
                  if (prevRuntime.state.isComplete) return prevRuntime;
                  log('solved', { artifactType: 'tile_puzzle', via: 'fallback' });
                  return {
                    kind: 'tile_puzzle',
                    state: {
                      ...prevRuntime.state,
                      isComplete: true,
                      completedAt: new Date().toISOString(),
                    },
                  };
                });
              }}
            >
              Jag klarade det
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetScenario(scenario.id);
            }}
          >
            Återställ
          </Button>
        </div>
      </Card>
    );
  }

  if (scenario.artifactType === 'logic_grid') {
    const logicConfig = config as LogicGridConfig;
    if (!runtime || runtime.kind !== 'logic_grid') return stateMismatch('logic_grid');
    const state = runtime.state;

    const onCellChange = (cell: LogicGridCell) => {
      updateRuntimeState(scenario.id, (prevRuntime) => {
        if (prevRuntime.kind !== 'logic_grid') return prevRuntime;
        const prev = prevRuntime.state;
        const without = prev.cells.filter(
          (c) =>
            !(
              c.rowCategoryId === cell.rowCategoryId &&
              c.rowItemIndex === cell.rowItemIndex &&
              c.colCategoryId === cell.colCategoryId &&
              c.colItemIndex === cell.colItemIndex
            )
        );
        const cells = [...without, cell];
        const isSolved = isLogicGridSolved(cells, logicConfig.solution);
        if (isSolved && !prev.isSolved) {
          log('solved', { artifactType: 'logic_grid', moveCount: prev.moveCount + 1 });
        }
        return {
          kind: 'logic_grid',
          state: {
            ...prev,
            cells,
            isSolved,
            moveCount: prev.moveCount + 1,
            solvedAt: isSolved ? new Date().toISOString() : prev.solvedAt,
          },
        };
      });
    };

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • logic_grid</div>
        <LogicGrid
          config={logicConfig}
          state={state}
          onCellChange={onCellChange}
          onRevealClue={(clueId) =>
            updateRuntimeState(scenario.id, (prevRuntime) => {
              if (prevRuntime.kind !== 'logic_grid') return prevRuntime;
              if (prevRuntime.state.revealedClueIds.includes(clueId)) return prevRuntime;
              log('revealed', { artifactType: 'logic_grid', clueId });
              return {
                kind: 'logic_grid',
                state: {
                  ...prevRuntime.state,
                  revealedClueIds: [...prevRuntime.state.revealedClueIds, clueId],
                },
              };
            })
          }
        />
        {role === 'participant' && !state.isSolved && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'logic_grid') return prevRuntime;
                  if (prevRuntime.state.isSolved) return prevRuntime;
                  log('solved', { artifactType: 'logic_grid', via: 'fallback' });
                  return {
                    kind: 'logic_grid',
                    state: {
                      ...prevRuntime.state,
                      isSolved: true,
                      solvedAt: new Date().toISOString(),
                    },
                  };
                });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'counter') {
    const counterConfig = config as CounterConfig;
    if (!runtime || runtime.kind !== 'counter') return stateMismatch('counter');
    const state = runtime.state;

    const increment = () =>
      updateRuntimeState(scenario.id, (prevRuntime) => {
        if (prevRuntime.kind !== 'counter') return prevRuntime;
        const prev = prevRuntime.state;
        const currentValue = prev.currentValue + 1;
        const isComplete = currentValue >= prev.target;
        if (isComplete && !prev.isComplete) log('solved', { artifactType: 'counter' });
        return { kind: 'counter', state: { ...prev, currentValue, isComplete } };
      });
    const decrement = () =>
      updateRuntimeState(scenario.id, (prevRuntime) => {
        if (prevRuntime.kind !== 'counter') return prevRuntime;
        const prev = prevRuntime.state;
        const currentValue = Math.max(0, prev.currentValue - 1);
        const isComplete = currentValue >= prev.target;
        return { kind: 'counter', state: { ...prev, currentValue, isComplete } };
      });

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • counter</div>
        {role === 'participant' ? (
          <CounterDisplay
            value={state.currentValue}
            target={state.target}
            label={counterConfig.label}
            isComplete={state.isComplete}
            variant="progress"
          />
        ) : (
          <InteractiveCounter
            state={state}
            target={state.target}
            label={counterConfig.label}
            allowDecrement={counterConfig.allowDecrement}
            onIncrement={increment}
            onDecrement={decrement}
          />
        )}
        {role === 'participant' && !state.isComplete && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'counter') return prevRuntime;
                  if (prevRuntime.state.isComplete) return prevRuntime;
                  log('solved', { artifactType: 'counter', via: 'fallback' });
                  return {
                    kind: 'counter',
                    state: {
                      ...prevRuntime.state,
                      currentValue: prevRuntime.state.target,
                      isComplete: true,
                    },
                  };
                });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'location_check') {
    const locationConfig = config as LocationCheckConfig;
    if (!runtime || runtime.kind !== 'location_check') return stateMismatch('location_check');
    const state = runtime.state;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • location_check</div>
        <LocationCheck
          config={locationConfig}
          state={state}
          onLocationUpdate={(coords) =>
            updateRuntimeState(scenario.id, (prevRuntime) => {
              if (prevRuntime.kind !== 'location_check') return prevRuntime;
              return {
                kind: 'location_check',
                state: {
                  ...prevRuntime.state,
                  currentCoordinates: coords,
                  lastCheckAt: new Date().toISOString(),
                },
              };
            })
          }
          onVerified={() => {
            updateRuntimeState(scenario.id, (prevRuntime) => {
              if (prevRuntime.kind !== 'location_check') return prevRuntime;
              return {
                kind: 'location_check',
                state: {
                  ...prevRuntime.state,
                  isVerified: true,
                  verifiedAt: new Date().toISOString(),
                },
              };
            });
            log('solved', { artifactType: 'location_check' });
          }}
          onQrScanned={(value) => {
            // Sandbox-only: accept configured QR value
            if (value && value === locationConfig.qrCodeValue) {
              updateRuntimeState(scenario.id, (prevRuntime) => {
                if (prevRuntime.kind !== 'location_check') return prevRuntime;
                return {
                  kind: 'location_check',
                  state: {
                    ...prevRuntime.state,
                    isVerified: true,
                    verifiedAt: new Date().toISOString(),
                  },
                };
              });
              log('solved', { artifactType: 'location_check', via: 'qr' });
            }
          }}
        />
        {role === 'participant' && !state.isVerified && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'location_check') return prevRuntime;
                  if (prevRuntime.state.isVerified) return prevRuntime;
                  return {
                    kind: 'location_check',
                    state: {
                      ...prevRuntime.state,
                      isVerified: true,
                      verifiedAt: new Date().toISOString(),
                    },
                  };
                });
                log('solved', { artifactType: 'location_check', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'prop_confirmation') {
    const propConfig = config as PropConfirmationConfig;
    if (!runtime || runtime.kind !== 'prop_confirmation') return stateMismatch('prop_confirmation');
    const state = runtime.state;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • prop_confirmation</div>

        {role === 'participant' ? (
          <PropRequest
            config={propConfig}
            state={state}
            onRequest={() => {
              updateRuntimeState(scenario.id, (prevRuntime) => {
                if (prevRuntime.kind !== 'prop_confirmation') return prevRuntime;
                return {
                  kind: 'prop_confirmation',
                  state: {
                    ...prevRuntime.state,
                    status: 'waiting',
                    requestedAt: new Date().toISOString(),
                  },
                };
              });
              log('custom', { action: 'prop_requested', artifactType: 'prop_confirmation' });
            }}
            onPhotoCapture={(photoUrl) => {
              updateRuntimeState(scenario.id, (prevRuntime) => {
                if (prevRuntime.kind !== 'prop_confirmation') return prevRuntime;
                return {
                  kind: 'prop_confirmation',
                  state: {
                    ...prevRuntime.state,
                    photoUrl,
                  },
                };
              });
              log('revealed', { artifactType: 'prop_confirmation', action: 'photo_captured' });
            }}
          />
        ) : (
          <PropConfirmControl
            config={propConfig}
            state={state}
            participantName="Sandbox Participant"
            onConfirm={(notes) => {
              updateRuntimeState(scenario.id, (prevRuntime) => {
                if (prevRuntime.kind !== 'prop_confirmation') return prevRuntime;
                return {
                  kind: 'prop_confirmation',
                  state: {
                    ...prevRuntime.state,
                    status: 'confirmed',
                    confirmedAt: new Date().toISOString(),
                    confirmedBy: 'host',
                    notes,
                  },
                };
              });
              log('solved', { artifactType: 'prop_confirmation', action: 'confirmed' });
            }}
            onReject={(notes) => {
              updateRuntimeState(scenario.id, (prevRuntime) => {
                if (prevRuntime.kind !== 'prop_confirmation') return prevRuntime;
                return {
                  kind: 'prop_confirmation',
                  state: {
                    ...prevRuntime.state,
                    status: 'rejected',
                    notes,
                  },
                };
              });
              log('failed', { artifactType: 'prop_confirmation', action: 'rejected' });
            }}
          />
        )}

        {role === 'participant' && state.status !== 'confirmed' && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'prop_confirmation') return prevRuntime;
                  if (prevRuntime.state.status === 'confirmed') return prevRuntime;
                  return {
                    kind: 'prop_confirmation',
                    state: {
                      ...prevRuntime.state,
                      status: 'confirmed',
                      confirmedAt: new Date().toISOString(),
                      confirmedBy: 'fallback',
                    },
                  };
                });
                log('solved', { artifactType: 'prop_confirmation', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'audio') {
    const audioConfig = config as {
      src: string;
      config?: Partial<AudioConfig>;
      title?: string;
      size?: 'sm' | 'md' | 'lg';
    };

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • audio</div>
        <AudioPlayer
          src={audioConfig.src}
          config={audioConfig.config}
          title={audioConfig.title}
          size={audioConfig.size}
        />
      </Card>
    );
  }

  if (scenario.artifactType === 'sound_level') {
    const soundConfig = config as SoundLevelConfig;
    if (!runtime || runtime.kind !== 'sound_level') return stateMismatch('sound_level');
    const state = runtime.state;

    const onLevelChange = (level: number) =>
      updateRuntimeState(scenario.id, (prevRuntime) => {
        if (prevRuntime.kind !== 'sound_level') return prevRuntime;
        return {
          kind: 'sound_level',
          state: {
            ...prevRuntime.state,
            currentLevel: level,
            peakLevel: Math.max(prevRuntime.state.peakLevel, level),
          },
        };
      });

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • sound_level</div>
        <SoundLevelMeter
          config={soundConfig}
          state={state}
          onLevelChange={onLevelChange}
          onTriggered={() =>
            updateRuntimeState(scenario.id, (prevRuntime) => {
              if (prevRuntime.kind !== 'sound_level') return prevRuntime;
              if (prevRuntime.state.isTriggered) return prevRuntime;
              log('solved', { artifactType: 'sound_level' });
              return {
                kind: 'sound_level',
                state: {
                  ...prevRuntime.state,
                  isTriggered: true,
                  triggeredAt: new Date().toISOString(),
                },
              };
            })
          }
        />
        {role === 'participant' && !state.isTriggered && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'sound_level') return prevRuntime;
                  if (prevRuntime.state.isTriggered) return prevRuntime;
                  log('solved', { artifactType: 'sound_level', via: 'fallback' });
                  return {
                    kind: 'sound_level',
                    state: {
                      ...prevRuntime.state,
                      isTriggered: true,
                      triggeredAt: new Date().toISOString(),
                    },
                  };
                });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  if (scenario.artifactType === 'replay_marker') {
    const replayConfig = config as ReplayMarkerConfig;
    if (!runtime || runtime.kind !== 'replay_marker') return stateMismatch('replay_marker');

    return (
      <ReplayMarkerArtifactCard
        role={role}
        scenarioId={scenario.id}
        replayConfig={replayConfig}
        runtime={runtime}
        updateRuntimeState={updateRuntimeState}
        log={log}
      />
    );
  }

  if (scenario.artifactType === 'multi_answer') {
    const multiConfig = config as MultiAnswerConfig;
    if (!runtime || runtime.kind !== 'multi_answer') return stateMismatch('multi_answer');
    const state = runtime.state;

    return (
      <Card className="p-4 space-y-4">
        <div className="text-sm text-muted-foreground">{role.toUpperCase()} • multi_answer</div>
        <MultiAnswerForm
          config={multiConfig}
          state={state}
          onChange={(next) => {
            updateRuntimeState(scenario.id, (prevRuntime) => {
              if (prevRuntime.kind !== 'multi_answer') return prevRuntime;
              const wasComplete = prevRuntime.state.isComplete;
              if (next.isComplete && !wasComplete) {
                log('solved', {
                  artifactType: 'multi_answer',
                  passedCount: next.passedCount,
                  totalCount: next.totalCount,
                });
              }
              return { kind: 'multi_answer', state: next };
            });
          }}
        />
        {role === 'participant' && !state.isComplete && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateRuntimeState(scenario.id, (prevRuntime) => {
                  if (prevRuntime.kind !== 'multi_answer') return prevRuntime;
                  if (prevRuntime.state.isComplete) return prevRuntime;
                  return {
                    kind: 'multi_answer',
                    state: {
                      ...prevRuntime.state,
                      isComplete: true,
                      passedCount: prevRuntime.state.totalCount,
                    },
                  };
                });
                log('solved', { artifactType: 'multi_answer', via: 'fallback' });
              }}
            >
              Jag klarade det
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // Not yet wired in renderer (still present in registry)
  return (
    <Card className="p-4 space-y-2">
      <div className="text-sm text-muted-foreground">{role.toUpperCase()} • {scenario.artifactType}</div>
      <div className="text-sm">
        Renderer saknas för denna artifactType i sandbox just nu.
      </div>
      <pre className="text-xs overflow-auto whitespace-pre-wrap text-muted-foreground">
        {JSON.stringify(config, null, 2)}
      </pre>
    </Card>
  );
}
