import { create } from 'zustand';
import type { SandboxArtifactScenarioId } from '../artifacts/registry';

export type SceneKey = 'map' | 'room_a' | 'room_b';

export type TriggerScope = 'actor' | 'scene' | 'session';

export type HotspotTarget =
  | { type: 'scene'; sceneKey: SceneKey }
  | { type: 'artifact'; scenarioId: SandboxArtifactScenarioId }
  | { type: 'trigger'; triggerIds: string[]; scope?: TriggerScope };

export type SceneHotspot = {
  id: string;
  x: number; // 0..100 (% of image)
  y: number; // 0..100
  radius: number; // 0..100
  label?: string;
  required?: boolean;
  target: HotspotTarget;
  visibleWhenPhases?: string[];
  enabledWhenPhases?: string[];
};

export type SceneDefinition = {
  key: SceneKey;
  label: string;
  imageUrl: string;
  hotspots: SceneHotspot[];
};

export type Participant = {
  id: string;
  name: string;
  currentSceneKey: SceneKey;
  lastSceneChangedAt: string;
};

export type SceneEventType =
  | 'navigate'
  | 'hotspot_click'
  | 'open_artifact'
  | 'close_artifact'
  | 'trigger_fire'
  | 'phase_change'
  | 'host_move'
  | 'custom';

export type SceneEvent = {
  id: string;
  at: string;
  type: SceneEventType;
  actorParticipantId?: string;
  payload?: Record<string, unknown>;
};

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export type ScenesPrototypeState = {
  phase: string;
  scenes: Record<SceneKey, SceneDefinition>;
  participants: Participant[];
  activeParticipantId: string;
  openArtifactScenarioId: SandboxArtifactScenarioId | null;
  events: SceneEvent[];

  setPhase: (phase: string) => void;
  setActiveParticipant: (participantId: string) => void;

  moveParticipantToScene: (participantId: string, toSceneKey: SceneKey, via?: string) => void;
  moveAllToScene: (toSceneKey: SceneKey, via?: string) => void;

  clickHotspot: (sceneKey: SceneKey, hotspotId: string) => void;
  closeArtifact: () => void;

  reset: () => void;
};

const DEFAULT_PHASE = 'lobby';

const defaultScenes: Record<SceneKey, SceneDefinition> = {
  map: {
    key: 'map',
    label: 'Karta',
    imageUrl: '/sandbox/scenes-map.svg',
    hotspots: [
      {
        id: 'to-room-a',
        x: 28,
        y: 45,
        radius: 10,
        label: 'Rum A',
        target: { type: 'scene', sceneKey: 'room_a' },
      },
      {
        id: 'to-room-b',
        x: 72,
        y: 55,
        radius: 10,
        label: 'Rum B',
        target: { type: 'scene', sceneKey: 'room_b' },
      },
    ],
  },
  room_a: {
    key: 'room_a',
    label: 'Rum A',
    imageUrl: '/sandbox/scenes-room-a.svg',
    hotspots: [
      {
        id: 'artifact-keypad',
        x: 65,
        y: 52,
        radius: 10,
        label: 'Kodlås',
        target: { type: 'artifact', scenarioId: 'keypad-4-digits' },
        enabledWhenPhases: ['lobby', 'search', 'finale'],
      },
      {
        id: 'trigger-note',
        x: 30,
        y: 62,
        radius: 10,
        label: 'Hitta lapp',
        target: { type: 'trigger', triggerIds: ['note_found'], scope: 'actor' },
      },
      {
        id: 'back-map',
        x: 12,
        y: 14,
        radius: 8,
        label: 'Till karta',
        target: { type: 'scene', sceneKey: 'map' },
      },
    ],
  },
  room_b: {
    key: 'room_b',
    label: 'Rum B',
    imageUrl: '/sandbox/scenes-room-b.svg',
    hotspots: [
      {
        id: 'artifact-riddle',
        x: 42,
        y: 50,
        radius: 10,
        label: 'Gåta',
        target: { type: 'artifact', scenarioId: 'riddle-text' },
      },
      {
        id: 'trigger-lock',
        x: 78,
        y: 60,
        radius: 10,
        label: 'Dörren',
        target: { type: 'trigger', triggerIds: ['door_interact'], scope: 'scene' },
      },
      {
        id: 'back-map',
        x: 12,
        y: 14,
        radius: 8,
        label: 'Till karta',
        target: { type: 'scene', sceneKey: 'map' },
      },
    ],
  },
};

function defaultParticipants(): Participant[] {
  const at = nowIso();
  return [
    { id: 'p1', name: 'Alex', currentSceneKey: 'map', lastSceneChangedAt: at },
    { id: 'p2', name: 'Bea', currentSceneKey: 'map', lastSceneChangedAt: at },
    { id: 'p3', name: 'Casey', currentSceneKey: 'map', lastSceneChangedAt: at },
  ];
}

function isPhaseAllowed(phase: string, allowed?: string[]) {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(phase);
}

export const useScenesPrototypeStore = create<ScenesPrototypeState>((set, get) => ({
  phase: DEFAULT_PHASE,
  scenes: defaultScenes,
  participants: defaultParticipants(),
  activeParticipantId: 'p1',
  openArtifactScenarioId: null,
  events: [],

  setPhase: (phase) => {
    set({ phase });
    set((s) => ({
      events: [
        {
          id: uid(),
          at: nowIso(),
          type: 'phase_change',
          payload: { phase },
        },
        ...s.events,
      ],
    }));
  },

  setActiveParticipant: (participantId) => set({ activeParticipantId: participantId }),

  moveParticipantToScene: (participantId, toSceneKey, via = 'host') => {
    const at = nowIso();
    set((s) => ({
      participants: s.participants.map((p) =>
        p.id === participantId
          ? { ...p, currentSceneKey: toSceneKey, lastSceneChangedAt: at }
          : p
      ),
      events: [
        {
          id: uid(),
          at,
          type: 'host_move',
          actorParticipantId: participantId,
          payload: { toSceneKey, via },
        },
        ...s.events,
      ],
    }));
  },

  moveAllToScene: (toSceneKey, via = 'host') => {
    const at = nowIso();
    const ids = get().participants.map((p) => p.id);
    set((s) => ({
      participants: s.participants.map((p) => ({ ...p, currentSceneKey: toSceneKey, lastSceneChangedAt: at })),
      events: [
        {
          id: uid(),
          at,
          type: 'host_move',
          payload: { toSceneKey, via, participantIds: ids },
        },
        ...s.events,
      ],
    }));
  },

  clickHotspot: (sceneKey, hotspotId) => {
    const { phase, scenes, activeParticipantId } = get();
    const scene = scenes[sceneKey];
    const hotspot = scene.hotspots.find((h) => h.id === hotspotId);

    set((s) => ({
      events: [
        {
          id: uid(),
          at: nowIso(),
          type: 'hotspot_click',
          actorParticipantId: activeParticipantId,
          payload: { sceneKey, hotspotId },
        },
        ...s.events,
      ],
    }));

    if (!hotspot) return;
    if (!isPhaseAllowed(phase, hotspot.visibleWhenPhases)) return;
    if (!isPhaseAllowed(phase, hotspot.enabledWhenPhases)) return;

    const target = hotspot.target;

    if (target.type === 'scene') {
      get().moveParticipantToScene(activeParticipantId, target.sceneKey, 'hotspot');
      return;
    }

    if (target.type === 'artifact') {
      set({ openArtifactScenarioId: target.scenarioId });
      set((s) => ({
        events: [
          {
            id: uid(),
            at: nowIso(),
            type: 'open_artifact',
            actorParticipantId: activeParticipantId,
            payload: { scenarioId: target.scenarioId, sceneKey },
          },
          ...s.events,
        ],
      }));
      return;
    }

    if (target.type === 'trigger') {
      set((s) => ({
        events: [
          {
            id: uid(),
            at: nowIso(),
            type: 'trigger_fire',
            actorParticipantId: activeParticipantId,
            payload: {
              triggerIds: target.triggerIds,
              scope: target.scope ?? 'actor',
              sceneKey,
            },
          },
          ...s.events,
        ],
      }));
    }
  },

  closeArtifact: () => {
    const { activeParticipantId, openArtifactScenarioId } = get();
    if (!openArtifactScenarioId) return;
    set({ openArtifactScenarioId: null });
    set((s) => ({
      events: [
        {
          id: uid(),
          at: nowIso(),
          type: 'close_artifact',
          actorParticipantId: activeParticipantId,
          payload: { scenarioId: openArtifactScenarioId },
        },
        ...s.events,
      ],
    }));
  },

  reset: () => {
    set({
      phase: DEFAULT_PHASE,
      scenes: defaultScenes,
      participants: defaultParticipants(),
      activeParticipantId: 'p1',
      openArtifactScenarioId: null,
      events: [],
    });
  },
}));
