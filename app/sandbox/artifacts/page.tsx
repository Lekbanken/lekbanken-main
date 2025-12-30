'use client';

import { useMemo, useState } from 'react';
import { SandboxShell } from '../components/shell/SandboxShellV2';
import { getModuleById } from '../config/sandbox-modules';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArtifactRenderer } from './ArtifactRenderer';
import {
  InteractiveImageEditor,
  type InteractiveImageEditorValue,
} from '@/components/ui/interactive-image-editor';
import {
  AudioUploadEditor,
  type AudioUploadEditorValue,
} from '@/components/ui/audio-upload-editor';
import {
  sandboxArtifactScenarios,
  type SandboxArtifactScenarioId,
} from './registry';
import { useSandboxArtifactRuntimeStore } from './runtime-store';
import type { ArtifactRole } from './schemas';
import { createInitialRuntimeStateForScenario } from './initial-state';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type AdminConfigCardProps = {
  scenario: (typeof sandboxArtifactScenarios)[number];
  configs: Record<SandboxArtifactScenarioId, unknown>;
  resetAfterApply: boolean;
  setResetAfterApply: (next: boolean) => void;
  setConfig: (scenarioId: SandboxArtifactScenarioId, config: unknown) => void;
  setRuntimeState: (
    scenarioId: SandboxArtifactScenarioId,
    state: ReturnType<typeof createInitialRuntimeStateForScenario>
  ) => void;
};

function AdminConfigCard({
  scenario,
  configs,
  resetAfterApply,
  setResetAfterApply,
  setConfig,
  setRuntimeState,
}: AdminConfigCardProps) {
  const [configText, setConfigText] = useState(() => {
    const cfg = configs[scenario.id] ?? scenario.defaultConfig;
    return JSON.stringify(cfg, null, 2);
  });
  const [configError, setConfigError] = useState<string | null>(null);

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Admin: Config (JSON)</div>
      <textarea
        className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
        value={configText}
        onChange={(e) => {
          setConfigText(e.target.value);
          setConfigError(null);
        }}
        spellCheck={false}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={resetAfterApply}
          onChange={(e) => setResetAfterApply(e.target.checked)}
        />
        Reset runtime state efter Apply
      </label>

      {configError && <div className="text-sm text-destructive whitespace-pre-wrap">{configError}</div>}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setConfigError(null);
            const cfg = configs[scenario.id] ?? scenario.defaultConfig;
            setConfigText(JSON.stringify(cfg, null, 2));
          }}
        >
          Återställ text
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setConfigError(null);

            let json: unknown;
            try {
              json = JSON.parse(configText);
            } catch (e) {
              setConfigError(`Ogiltig JSON: ${(e as Error).message}`);
              return;
            }

            const parsed = scenario.configSchema.safeParse(json);
            if (!parsed.success) {
              setConfigError(
                `Config matchar inte schema:\n${JSON.stringify(parsed.error.flatten(), null, 2)}`
              );
              return;
            }

            setConfig(scenario.id, parsed.data);
            setConfigText(JSON.stringify(parsed.data, null, 2));
            if (resetAfterApply) {
              setRuntimeState(
                scenario.id,
                createInitialRuntimeStateForScenario(scenario, parsed.data)
              );
            }
          }}
        >
          Apply
        </Button>
      </div>
    </Card>
  );
}

type AdminMediaEditorsProps = {
  scenario: (typeof sandboxArtifactScenarios)[number];
  configs: Record<SandboxArtifactScenarioId, unknown>;
  resetAfterApply: boolean;
  setConfig: (scenarioId: SandboxArtifactScenarioId, config: unknown) => void;
  setRuntimeState: (
    scenarioId: SandboxArtifactScenarioId,
    state: ReturnType<typeof createInitialRuntimeStateForScenario>
  ) => void;
};

function AdminHotspotEditorCard({ scenario, configs, resetAfterApply, setConfig, setRuntimeState }: AdminMediaEditorsProps) {
  const cfg = configs[scenario.id] ?? scenario.defaultConfig;
  const parsed = scenario.configSchema.safeParse(cfg);

  if (!parsed.success) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">Admin: Hotspot editor</div>
        <div className="text-sm text-destructive">Config matchar inte schema (kan inte visa editor).</div>
      </Card>
    );
  }

  const config = parsed.data as Record<string, unknown>;
  const hotspotsRaw = config['hotspots'];
  const zones = Array.isArray(hotspotsRaw)
    ? hotspotsRaw
        .map((h) => (isRecord(h) ? h : null))
        .filter((h): h is Record<string, unknown> => Boolean(h))
        .flatMap((h) => {
          const id = typeof h.id === 'string' ? h.id : null;
          const x = typeof h.x === 'number' ? h.x : null;
          const y = typeof h.y === 'number' ? h.y : null;
          const radius = typeof h.radius === 'number' ? h.radius : null;
          if (!id || x === null || y === null || radius === null) return [];
          return [
            {
              id,
              x,
              y,
              radius,
              label: typeof h.label === 'string' ? h.label : undefined,
              required: typeof h.required === 'boolean' ? h.required : undefined,
            },
          ];
        })
    : [];

  const imageRefRaw = config['imageRef'];
  const value: InteractiveImageEditorValue = {
    imageRef: isRecord(imageRefRaw) && typeof imageRefRaw.bucket === 'string' && typeof imageRefRaw.path === 'string'
      ? (imageRefRaw as InteractiveImageEditorValue['imageRef'])
      : null,
    zones,
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Admin: Hotspot editor</div>
      <InteractiveImageEditor
        value={value}
        tenantId={null}
        onChange={(next) => {
          const nextConfig: Record<string, unknown> = {
            ...config,
            imageRef: next.imageRef ?? undefined,
            hotspots: next.zones.map((z) => ({
              id: z.id,
              x: z.x,
              y: z.y,
              radius: z.radius,
              label: z.label,
              required: z.required,
            })),
          };

          if (next.imageRef) {
            delete nextConfig.imageUrl;
          }

          setConfig(scenario.id, nextConfig);
          if (resetAfterApply) {
            setRuntimeState(scenario.id, createInitialRuntimeStateForScenario(scenario, nextConfig));
          }
        }}
      />
    </Card>
  );
}

function AdminAudioEditorCard({ scenario, configs, resetAfterApply, setConfig, setRuntimeState }: AdminMediaEditorsProps) {
  const cfg = configs[scenario.id] ?? scenario.defaultConfig;
  const parsed = scenario.configSchema.safeParse(cfg);

  if (!parsed.success) {
    return (
      <Card className="p-4 space-y-2">
        <div className="text-sm font-medium">Admin: Audio editor</div>
        <div className="text-sm text-destructive">Config matchar inte schema (kan inte visa editor).</div>
      </Card>
    );
  }

  const config = parsed.data as Record<string, unknown>;
  const audioRefRaw = config['audioRef'];
  const audioRef = isRecord(audioRefRaw) && typeof audioRefRaw.bucket === 'string' && typeof audioRefRaw.path === 'string'
    ? (audioRefRaw as AudioUploadEditorValue['audioRef'])
    : null;
  const configObjRaw = config['config'];
  const configObj = isRecord(configObjRaw) ? configObjRaw : null;

  const value: AudioUploadEditorValue = {
    audioRef,
    autoPlay: configObj ? Boolean(configObj.autoPlay) : false,
    requireAck: configObj ? Boolean(configObj.requireAck) : false,
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Admin: Audio editor</div>
      <AudioUploadEditor
        value={value}
        tenantId={null}
        onChange={(next) => {
          const existingConfigRaw = config['config'];
          const existingConfig = isRecord(existingConfigRaw) ? existingConfigRaw : {};
          const nextConfig: Record<string, unknown> = {
            ...config,
            audioRef: next.audioRef ?? undefined,
            config: {
              ...existingConfig,
              autoPlay: next.autoPlay,
              requireAck: next.requireAck,
            },
          };

          if (next.audioRef) {
            delete nextConfig.src;
          }

          setConfig(scenario.id, nextConfig);
          if (resetAfterApply) {
            setRuntimeState(scenario.id, createInitialRuntimeStateForScenario(scenario, nextConfig));
          }
        }}
      />
    </Card>
  );
}

export default function SandboxArtifactsPage() {
  const sandboxModule = getModuleById('artifacts');

  const [resetAfterApply, setResetAfterApply] = useState(true);

  const {
    activeScenarioId,
    activeRole,
    configs,
    runtimeStates,
    events,
    setActiveScenario,
    setActiveRole,
    setConfig,
    setRuntimeState,
    updateRuntimeState,
    addEvent,
    resetScenario,
    resetAll,
  } = useSandboxArtifactRuntimeStore((s) => ({
    activeScenarioId: s.activeScenarioId,
    activeRole: s.activeRole,
    configs: s.configs,
    runtimeStates: s.runtimeStates,
    events: s.events,
    setActiveScenario: s.setActiveScenario,
    setActiveRole: s.setActiveRole,
    setConfig: s.setConfig,
    setRuntimeState: s.setRuntimeState,
    updateRuntimeState: s.updateRuntimeState,
    addEvent: s.addEvent,
    resetScenario: s.resetScenario,
    resetAll: s.resetAll,
  }));

  const scenario = useMemo(
    () => sandboxArtifactScenarios.find((x) => x.id === activeScenarioId) ?? null,
    [activeScenarioId]
  );

  const runtime = scenario ? runtimeStates[scenario.id] : null;

  const isSolved = useMemo(() => {
    if (!runtime) return false;
    switch (runtime.kind) {
      case 'keypad':
        return runtime.state.isSolved;
      case 'riddle':
        return runtime.state.isCorrect;
      case 'cipher':
        return runtime.state.isDecoded;
      case 'qr_gate':
        return runtime.state.isVerified;
      case 'hint_container':
        return false;
      case 'hotspot':
        return runtime.state.isComplete;
      case 'tile_puzzle':
        return runtime.state.isComplete;
      case 'logic_grid':
        return runtime.state.isSolved;
      case 'counter':
        return runtime.state.isComplete;
      case 'location_check':
        return runtime.state.isVerified;
      case 'prop_confirmation':
        return runtime.state.status === 'confirmed';
      case 'replay_marker':
        return false;
      case 'sound_level':
        return runtime.state.isTriggered;
      case 'multi_answer':
        return runtime.state.isComplete;
      default:
        return false;
    }
  }, [runtime]);

  return (
    <SandboxShell
      moduleId="artifacts"
      title={sandboxModule?.module.label ?? 'Artifacts Harness'}
      description={
        sandboxModule?.module.description ??
        'Välj scenario och växla roll för att testa artifacts i sandbox.'
      }
    >
      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Scenario</label>
              <select
                className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                value={activeScenarioId}
                onChange={(e) => setActiveScenario(e.target.value as SandboxArtifactScenarioId)}
              >
                {sandboxArtifactScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {scenario?.description && (
                <p className="text-xs text-muted-foreground">{scenario.description}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Roll</div>
              <div className="flex flex-wrap gap-2">
                {(['admin', 'host', 'participant'] as ArtifactRole[]).map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={activeRole === role ? 'default' : 'outline'}
                    onClick={() => setActiveRole(role)}
                  >
                    {role.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {scenario?.id === 'hotspot-clickable-image' && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" href="/sandbox/scenes">
                  Öppna Scenes Prototype (karta → rum)
                </Button>
                <div className="text-xs text-muted-foreground">
                  Prototyp för navigerbar karta med per-deltagare position.
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => resetScenario(activeScenarioId)}>
                Återställ scenario
              </Button>
              <Button variant="outline" size="sm" onClick={() => resetAll()}>
                Återställ allt
              </Button>
            </div>
          </div>
        </Card>

        {scenario && activeRole === 'admin' && (
          <>
            {scenario.artifactType === 'hotspot' && (
              <AdminHotspotEditorCard
                key={`${scenario.id}-hotspot-editor`}
                scenario={scenario}
                configs={configs}
                resetAfterApply={resetAfterApply}
                setConfig={setConfig}
                setRuntimeState={setRuntimeState}
              />
            )}

            {scenario.artifactType === 'audio' && (
              <AdminAudioEditorCard
                key={`${scenario.id}-audio-editor`}
                scenario={scenario}
                configs={configs}
                resetAfterApply={resetAfterApply}
                setConfig={setConfig}
                setRuntimeState={setRuntimeState}
              />
            )}

            <AdminConfigCard
              key={scenario.id}
              scenario={scenario}
              configs={configs}
              resetAfterApply={resetAfterApply}
              setResetAfterApply={setResetAfterApply}
              setConfig={setConfig}
              setRuntimeState={setRuntimeState}
            />
          </>
        )}

        {scenario && (activeRole === 'host' || activeRole === 'admin') && runtime && (
          <Card className="p-4 space-y-3">
            <div className="text-sm font-medium">Host: Status & Controls</div>

            <div className="text-sm text-muted-foreground">
              Kind: <span className="font-mono">{runtime.kind}</span> • Status:{' '}
              <span className="font-mono">{isSolved ? 'solved' : 'in_progress'}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  updateRuntimeState(scenario.id, (prev) => {
                    const cfg: unknown = configs[scenario.id] ?? scenario.defaultConfig;
                    const acceptedAnswers =
                      isRecord(cfg) && Array.isArray(cfg.acceptedAnswers)
                        ? cfg.acceptedAnswers.filter((a): a is string => typeof a === 'string')
                        : [];
                    const hotspotIds =
                      isRecord(cfg) && Array.isArray(cfg.hotspots)
                        ? cfg.hotspots.flatMap((h) =>
                            isRecord(h) && typeof h.id === 'string' ? [h.id] : []
                          )
                        : null;

                    switch (prev.kind) {
                      case 'keypad':
                        return { kind: 'keypad', state: { isSolved: true } };
                      case 'riddle':
                        return {
                          kind: 'riddle',
                          state: {
                            ...prev.state,
                            isCorrect: true,
                            correctAnswer:
                              prev.state.correctAnswer ?? (acceptedAnswers[0] ?? undefined),
                          },
                        };
                      case 'cipher':
                        return {
                          kind: 'cipher',
                          state: {
                            ...prev.state,
                            isDecoded: true,
                            decodedAt: new Date().toISOString(),
                          },
                        };
                      case 'qr_gate':
                        return {
                          kind: 'qr_gate',
                          state: { ...prev.state, isVerified: true, usedFallback: true },
                        };
                      case 'hotspot':
                        return {
                          kind: 'hotspot',
                          state: {
                            ...prev.state,
                            isComplete: true,
                            foundCount: prev.state.requiredCount,
                            foundHotspotIds: hotspotIds ?? prev.state.foundHotspotIds,
                          },
                        };
                      case 'tile_puzzle':
                        return {
                          kind: 'tile_puzzle',
                          state: {
                            ...prev.state,
                            isComplete: true,
                            completedAt: new Date().toISOString(),
                          },
                        };
                      case 'logic_grid':
                        return {
                          kind: 'logic_grid',
                          state: {
                            ...prev.state,
                            isSolved: true,
                            solvedAt: new Date().toISOString(),
                          },
                        };
                      case 'counter':
                        return {
                          kind: 'counter',
                          state: { ...prev.state, currentValue: prev.state.target, isComplete: true },
                        };
                      case 'location_check':
                        return {
                          kind: 'location_check',
                          state: { ...prev.state, isVerified: true, verifiedAt: new Date().toISOString() },
                        };
                      case 'prop_confirmation':
                        return {
                          kind: 'prop_confirmation',
                          state: {
                            ...prev.state,
                            status: 'confirmed',
                            confirmedAt: new Date().toISOString(),
                            confirmedBy: 'host',
                          },
                        };
                      case 'sound_level':
                        return {
                          kind: 'sound_level',
                          state: {
                            ...prev.state,
                            isTriggered: true,
                            triggeredAt: new Date().toISOString(),
                          },
                        };
                      case 'multi_answer':
                        return {
                          kind: 'multi_answer',
                          state: {
                            ...prev.state,
                            isComplete: true,
                            passedCount: prev.state.totalCount,
                          },
                        };

                      default:
                        return prev;
                    }
                  });

                  addEvent({
                    scenarioId: scenario.id,
                    role: activeRole,
                    type: 'solved',
                    payload: { via: 'host_panel' },
                  });
                }}
              >
                Mark solved
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addEvent({
                    scenarioId: scenario.id,
                    role: activeRole,
                    type: 'failed',
                    payload: { via: 'host_panel' },
                  })
                }
              >
                Log failed
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  addEvent({
                    scenarioId: scenario.id,
                    role: activeRole,
                    type: 'revealed',
                    payload: { via: 'host_panel' },
                  })
                }
              >
                Log revealed
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => resetScenario(scenario.id)}
              >
                Reset runtime
              </Button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Runtime snapshot</div>
              <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded-md border p-2">
                {JSON.stringify(runtime, null, 2)}
              </pre>
            </div>
          </Card>
        )}

        {scenario ? (
          <ArtifactRenderer
            scenario={scenario}
            role={activeRole}
            configOverride={configs[scenario.id]}
          />
        ) : (
          <Card className="p-4 text-sm text-muted-foreground">Scenario saknas.</Card>
        )}

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Event log</div>
            <div className="text-xs text-muted-foreground">{events.length} events</div>
          </div>

          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground">Inga events ännu.</div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {[...events].slice(-50).reverse().map((evt) => (
                <div key={evt.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-muted-foreground">{evt.timestamp}</div>
                    <div className="font-mono">{evt.type}</div>
                    <div className="text-muted-foreground">
                      {evt.role} • {evt.scenarioId}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SandboxShell>
  );
}
