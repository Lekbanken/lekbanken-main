import { create } from 'zustand';
import type { ArtifactRole } from './schemas';
import type { SandboxArtifactScenarioId } from './registry';
import { getSandboxArtifactScenarioById, sandboxArtifactScenarios } from './registry';
import { createInitialRuntimeStateForScenario, type SandboxArtifactRuntimeState } from './initial-state';

export type SandboxArtifactEventType =
  | 'config_updated'
  | 'state_updated'
  | 'reset'
  | 'solved'
  | 'failed'
  | 'revealed'
  | 'custom';

export type SandboxArtifactEvent = {
  id: string;
  timestamp: string;
  scenarioId: SandboxArtifactScenarioId;
  role: ArtifactRole;
  type: SandboxArtifactEventType;
  payload?: Record<string, unknown>;
};

export type SandboxArtifactRuntimeStore = {
  activeScenarioId: SandboxArtifactScenarioId;
  activeRole: ArtifactRole;

  configs: Record<SandboxArtifactScenarioId, unknown>;
  runtimeStates: Record<SandboxArtifactScenarioId, SandboxArtifactRuntimeState>;
  events: SandboxArtifactEvent[];

  setActiveScenario: (id: SandboxArtifactScenarioId) => void;
  setActiveRole: (role: ArtifactRole) => void;

  setConfig: (scenarioId: SandboxArtifactScenarioId, config: unknown) => void;
  setRuntimeState: (scenarioId: SandboxArtifactScenarioId, state: SandboxArtifactRuntimeState) => void;
  updateRuntimeState: (
    scenarioId: SandboxArtifactScenarioId,
    updater: (prev: SandboxArtifactRuntimeState) => SandboxArtifactRuntimeState
  ) => void;

  addEvent: (event: Omit<SandboxArtifactEvent, 'id' | 'timestamp'>) => void;

  resetScenario: (scenarioId: SandboxArtifactScenarioId) => void;
  resetAll: () => void;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildInitialConfigs(): Record<SandboxArtifactScenarioId, unknown> {
  const out: Partial<Record<SandboxArtifactScenarioId, unknown>> = {};
  for (const scenario of sandboxArtifactScenarios) {
    out[scenario.id] = scenario.defaultConfig;
  }
  return out as Record<SandboxArtifactScenarioId, unknown>;
}

function buildInitialRuntimeStates(): Record<SandboxArtifactScenarioId, SandboxArtifactRuntimeState> {
  const out: Partial<Record<SandboxArtifactScenarioId, SandboxArtifactRuntimeState>> = {};
  for (const scenario of sandboxArtifactScenarios) {
    out[scenario.id] = createInitialRuntimeStateForScenario(scenario);
  }
  return out as Record<SandboxArtifactScenarioId, SandboxArtifactRuntimeState>;
}

const DEFAULT_SCENARIO: SandboxArtifactScenarioId = 'keypad-4-digits';

export const useSandboxArtifactRuntimeStore = create<SandboxArtifactRuntimeStore>((set, get) => ({
  activeScenarioId: DEFAULT_SCENARIO,
  activeRole: 'participant',

  configs: buildInitialConfigs(),
  runtimeStates: buildInitialRuntimeStates(),
  events: [],

  setActiveScenario: (id) => {
    const prevId = get().activeScenarioId;
    set({ activeScenarioId: id });

    get().addEvent({
      scenarioId: id,
      role: get().activeRole,
      type: 'custom',
      payload: { action: 'active_scenario_changed', from: prevId, to: id },
    });
  },
  setActiveRole: (role) => {
    const prevRole = get().activeRole;
    set({ activeRole: role });

    get().addEvent({
      scenarioId: get().activeScenarioId,
      role,
      type: 'custom',
      payload: { action: 'active_role_changed', from: prevRole, to: role },
    });
  },

  setConfig: (scenarioId, config) => {
    set((prev) => ({
      configs: { ...prev.configs, [scenarioId]: config },
    }));

    get().addEvent({
      scenarioId,
      role: get().activeRole,
      type: 'config_updated',
      payload: { scenarioId },
    });
  },

  setRuntimeState: (scenarioId, state) => {
    set((prev) => ({
      runtimeStates: { ...prev.runtimeStates, [scenarioId]: state },
    }));

    get().addEvent({
      scenarioId,
      role: get().activeRole,
      type: 'state_updated',
      payload: { scenarioId, kind: state.kind },
    });
  },

  updateRuntimeState: (scenarioId, updater) => {
    const prevState = get().runtimeStates[scenarioId];
    const nextState = updater(prevState);

    set((prev) => ({
      runtimeStates: { ...prev.runtimeStates, [scenarioId]: nextState },
    }));

    get().addEvent({
      scenarioId,
      role: get().activeRole,
      type: 'state_updated',
      payload: { scenarioId, kind: nextState.kind },
    });
  },

  addEvent: (event) =>
    set((prev) => ({
      events: [
        ...prev.events,
        {
          ...event,
          id: makeId('evt'),
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  resetScenario: (scenarioId) => {
    const scenario = getSandboxArtifactScenarioById(scenarioId);
    if (!scenario) return;

    set((prev) => ({
      configs: { ...prev.configs, [scenarioId]: scenario.defaultConfig },
      runtimeStates: {
        ...prev.runtimeStates,
        [scenarioId]: createInitialRuntimeStateForScenario(scenario),
      },
    }));

    get().addEvent({
      scenarioId,
      role: get().activeRole,
      type: 'reset',
      payload: { scenarioId },
    });
  },

  resetAll: () => {
    set({
      configs: buildInitialConfigs(),
      runtimeStates: buildInitialRuntimeStates(),
      events: [],
      activeScenarioId: DEFAULT_SCENARIO,
      activeRole: 'participant',
    });
  },
}));

export function useActiveSandboxArtifactScenario() {
  return useSandboxArtifactRuntimeStore((s) => {
    const scenario = getSandboxArtifactScenarioById(s.activeScenarioId);
    return {
      activeScenarioId: s.activeScenarioId,
      scenario,
      role: s.activeRole,
      config: s.configs[s.activeScenarioId],
      runtimeState: s.runtimeStates[s.activeScenarioId],
      events: s.events,
    };
  });
}
