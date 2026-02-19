'use client';

import { useMemo } from 'react';

import { SandboxShell as SandboxShellV2 } from '../components/shell/SandboxShellV2';
import { getModuleById } from '../config/sandbox-modules';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

import { ArtifactRenderer } from '../artifacts/ArtifactRenderer';
import { getSandboxArtifactScenarioById } from '../artifacts/registry';

import { HotspotImage } from '@/components/play/HotspotImage';
import type { HotspotConfig, HotspotState } from '@/types/puzzle-modules';

import { useScenesPrototypeStore, type SceneKey } from './runtime-store';

export default function SandboxScenesPrototypePage() {
  const sandboxModule = getModuleById('scenes');

  const {
    phase,
    scenes,
    participants,
    activeParticipantId,
    openArtifactScenarioId,
    events,
    setPhase,
    setActiveParticipant,
    moveParticipantToScene,
    moveAllToScene,
    clickHotspot,
    closeArtifact,
    reset,
  } = useScenesPrototypeStore((s) => ({
    phase: s.phase,
    scenes: s.scenes,
    participants: s.participants,
    activeParticipantId: s.activeParticipantId,
    openArtifactScenarioId: s.openArtifactScenarioId,
    events: s.events,
    setPhase: s.setPhase,
    setActiveParticipant: s.setActiveParticipant,
    moveParticipantToScene: s.moveParticipantToScene,
    moveAllToScene: s.moveAllToScene,
    clickHotspot: s.clickHotspot,
    closeArtifact: s.closeArtifact,
    reset: s.reset,
  }));

  const activeParticipant = useMemo(
    () => participants.find((p) => p.id === activeParticipantId) ?? participants[0],
    [participants, activeParticipantId]
  );

  const activeSceneKey = (activeParticipant?.currentSceneKey ?? 'map') as SceneKey;
  const activeScene = scenes[activeSceneKey];

  const openScenario = openArtifactScenarioId
    ? getSandboxArtifactScenarioById(openArtifactScenarioId)
    : null;

  const hotspotConfig: HotspotConfig = useMemo(
    () => ({
      imageArtifactId: 'sandbox-scene-image',
      imageUrl: activeScene.imageUrl,
      hotspots: activeScene.hotspots.map((h) => ({
        id: h.id,
        x: h.x,
        y: h.y,
        radius: h.radius,
        label: h.label,
        required: h.required,
      })),
      requireAll: false,
      showProgress: true,
      allowZoom: true,
      hapticFeedback: false,
    }),
    [activeScene.imageUrl, activeScene.hotspots]
  );

  const hotspotState: HotspotState = useMemo(() => {
    const requiredHotspots = hotspotConfig.hotspots.filter((h) => h.required !== false);
    const requiredCount = hotspotConfig.requireAll ? requiredHotspots.length : requiredHotspots.length;
    return {
      foundHotspotIds: [],
      foundCount: 0,
      requiredCount,
      isComplete: false,
    };
  }, [hotspotConfig.hotspots, hotspotConfig.requireAll]);

  return (
    <SandboxShellV2
      moduleId="scenes"
      title={sandboxModule?.module.label ?? 'Scenes Prototype'}
      description={
        sandboxModule?.module.description ??
        'Prototyp: karta/rum med hotspot-navigering, per deltagare-position, och host-controls.'
      }
    >
      <div className="space-y-6">
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              Phase: <span className="font-mono">{phase}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => reset()}>
                Reset
              </Button>
              <Button size="sm" variant="outline" href="/sandbox/artifacts">
                Till Artifacts Harness
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Select
                label="Participant"
                value={activeParticipantId}
                onChange={(e) => setActiveParticipant(e.target.value)}
                options={participants.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.currentSceneKey})`,
                }))}
              />

              <div className="text-xs text-muted-foreground">
                currentSceneKey: <span className="font-mono">{activeSceneKey}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => moveParticipantToScene(activeParticipantId, 'map', 'host')}>
                  Karta
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPhase('lobby')}>
                  lobby
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPhase('search')}>
                  search
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPhase('finale')}>
                  finale
                </Button>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Scene</div>
                  <div className="text-xs text-muted-foreground">
                    Karta → <span className="font-mono">{activeScene.label}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => moveParticipantToScene(activeParticipantId, 'map', 'host')}>
                  Till karta
                </Button>
              </div>

              <HotspotImage
                config={hotspotConfig}
                state={hotspotState}
                onHotspotFound={(hotspotId) => clickHotspot(activeSceneKey, hotspotId)}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="text-sm font-medium">Host panel</div>

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" onClick={() => moveAllToScene('map', 'host')}>
              Flytta alla till karta
            </Button>
            <Button size="sm" variant="outline" onClick={() => moveAllToScene('room_a', 'host')}>
              Flytta alla till Rum A
            </Button>
            <Button size="sm" variant="outline" onClick={() => moveAllToScene('room_b', 'host')}>
              Flytta alla till Rum B
            </Button>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Participant</th>
                  <th className="py-2 pr-3">Scene</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        className={
                          p.id === activeParticipantId
                            ? 'font-medium underline underline-offset-4'
                            : 'hover:underline hover:underline-offset-4'
                        }
                        onClick={() => setActiveParticipant(p.id)}
                      >
                        {p.name}
                      </button>
                    </td>
                    <td className="py-2 pr-3 font-mono">{p.currentSceneKey}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => moveParticipantToScene(p.id, 'map', 'host')}>
                          Karta
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => moveParticipantToScene(p.id, 'room_a', 'host')}>
                          Rum A
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => moveParticipantToScene(p.id, 'room_b', 'host')}>
                          Rum B
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {openScenario && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Artifact panel</div>
                <div className="text-xs text-muted-foreground">
                  Scenario: <span className="font-mono">{openScenario.id}</span> • {openScenario.label}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => closeArtifact()}>
                Stäng
              </Button>
            </div>

            <ArtifactRenderer scenario={openScenario} role="participant" />
          </Card>
        )}

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Event log</div>
            <div className="text-xs text-muted-foreground">{events.length} events</div>
          </div>

          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3">at</th>
                  <th className="py-1 pr-3">type</th>
                  <th className="py-1 pr-3">actor</th>
                  <th className="py-1 pr-3">payload</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 200).map((ev) => (
                  <tr key={ev.id} className="border-t align-top">
                    <td className="py-1 pr-3 font-mono whitespace-nowrap">{ev.at}</td>
                    <td className="py-1 pr-3 font-mono">{ev.type}</td>
                    <td className="py-1 pr-3 font-mono">{ev.actorParticipantId ?? '-'}</td>
                    <td className="py-1 pr-3 font-mono whitespace-pre-wrap break-words">
                      {ev.payload ? JSON.stringify(ev.payload) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </SandboxShellV2>
  );
}
