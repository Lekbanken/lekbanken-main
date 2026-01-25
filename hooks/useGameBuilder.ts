'use client';

import { useReducer, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  type GameBuilderState,
  type BuilderHistory,
  type BuilderAction,
  type CommittingAction,
  type StepData,
  type PhaseData,
  type RoleData,
  type CoreForm,
  type MaterialsForm,
  type BoardConfigData,
  type GameToolForm,
  type CoverMedia,
  isCommittingAction,
  createInitialHistory,
  MAX_HISTORY_SIZE,
} from '@/types/game-builder-state';
import type { ArtifactFormData, TriggerFormData } from '@/types/games';

// ============================================================================
// Pure State Reducer (no history management)
// ============================================================================

function stateReducer(state: GameBuilderState, action: BuilderAction): GameBuilderState {
  switch (action.type) {
    // Core
    case 'SET_CORE':
      return { ...state, core: { ...state.core, ...action.payload } };

    // Steps
    case 'ADD_STEP':
      return { ...state, steps: [...state.steps, action.payload] };
    case 'DELETE_STEP':
      return { ...state, steps: state.steps.filter((s) => s.id !== action.payload.id) };
    case 'UPDATE_STEP':
      return {
        ...state,
        steps: state.steps.map((s) =>
          s.id === action.payload.id ? { ...s, ...action.payload.data } : s
        ),
      };
    case 'SET_STEPS':
      return { ...state, steps: action.payload };
    case 'REORDER_STEPS': {
      const newSteps = [...state.steps];
      const [removed] = newSteps.splice(action.payload.from, 1);
      newSteps.splice(action.payload.to, 0, removed);
      return { ...state, steps: newSteps };
    }

    // Phases
    case 'ADD_PHASE':
      return { ...state, phases: [...state.phases, action.payload] };
    case 'DELETE_PHASE':
      return { ...state, phases: state.phases.filter((p) => p.id !== action.payload.id) };
    case 'UPDATE_PHASE':
      return {
        ...state,
        phases: state.phases.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.data } : p
        ),
      };
    case 'SET_PHASES':
      return { ...state, phases: action.payload };
    case 'REORDER_PHASES': {
      const newPhases = [...state.phases];
      const [removed] = newPhases.splice(action.payload.from, 1);
      newPhases.splice(action.payload.to, 0, removed);
      return { ...state, phases: newPhases };
    }

    // Roles
    case 'ADD_ROLE':
      return { ...state, roles: [...state.roles, action.payload] };
    case 'DELETE_ROLE':
      return { ...state, roles: state.roles.filter((r) => r.id !== action.payload.id) };
    case 'UPDATE_ROLE':
      return {
        ...state,
        roles: state.roles.map((r) =>
          r.id === action.payload.id ? { ...r, ...action.payload.data } : r
        ),
      };
    case 'SET_ROLES':
      return { ...state, roles: action.payload };
    case 'REORDER_ROLES': {
      const newRoles = [...state.roles];
      const [removed] = newRoles.splice(action.payload.from, 1);
      newRoles.splice(action.payload.to, 0, removed);
      return { ...state, roles: newRoles };
    }

    // Artifacts
    case 'ADD_ARTIFACT':
      return { ...state, artifacts: [...state.artifacts, action.payload] };
    case 'DELETE_ARTIFACT':
      return { ...state, artifacts: state.artifacts.filter((a) => a.id !== action.payload.id) };
    case 'UPDATE_ARTIFACT':
      return {
        ...state,
        artifacts: state.artifacts.map((a) =>
          a.id === action.payload.id ? { ...a, ...action.payload.data } : a
        ),
      };
    case 'SET_ARTIFACTS':
      return { ...state, artifacts: action.payload };
    case 'REORDER_ARTIFACTS': {
      const newArtifacts = [...state.artifacts];
      const [removed] = newArtifacts.splice(action.payload.from, 1);
      newArtifacts.splice(action.payload.to, 0, removed);
      return { ...state, artifacts: newArtifacts };
    }

    // Triggers
    case 'ADD_TRIGGER':
      return { ...state, triggers: [...state.triggers, action.payload] };
    case 'DELETE_TRIGGER':
      return { ...state, triggers: state.triggers.filter((t) => t.id !== action.payload.id) };
    case 'UPDATE_TRIGGER':
      return {
        ...state,
        triggers: state.triggers.map((t) =>
          t.id === action.payload.id ? { ...t, ...action.payload.data } : t
        ),
      };
    case 'SET_TRIGGERS':
      return { ...state, triggers: action.payload };
    case 'REORDER_TRIGGERS': {
      const newTriggers = [...state.triggers];
      const [removed] = newTriggers.splice(action.payload.from, 1);
      newTriggers.splice(action.payload.to, 0, removed);
      return { ...state, triggers: newTriggers };
    }

    // Other state
    case 'SET_MATERIALS':
      return { ...state, materials: { ...state.materials, ...action.payload } };
    case 'SET_BOARD_CONFIG':
      return { ...state, boardConfig: { ...state.boardConfig, ...action.payload } };
    case 'SET_GAME_TOOLS':
      return { ...state, gameTools: action.payload };
    case 'SET_SUB_PURPOSE_IDS':
      return { ...state, subPurposeIds: action.payload };
    case 'SET_COVER':
      return { ...state, cover: action.payload };

    // History actions are handled by historyReducer
    case 'UNDO':
    case 'REDO':
    case 'COMMIT_TO_HISTORY':
    case 'LOAD_FROM_API':
    case 'RESET':
      return state;

    default:
      return state;
  }
}

// ============================================================================
// History Reducer (wraps state reducer)
// ============================================================================

function historyReducer(history: BuilderHistory, action: BuilderAction): BuilderHistory {
  const { past, present, future } = history;

  switch (action.type) {
    case 'UNDO': {
      if (past.length === 0) return history;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    }

    case 'REDO': {
      if (future.length === 0) return history;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    }

    case 'COMMIT_TO_HISTORY': {
      // Push current state to history (used after debounced text edits)
      const newPast = [...past, present].slice(-MAX_HISTORY_SIZE);
      return {
        past: newPast,
        present,
        future: [], // Clear future on new commit
      };
    }

    case 'LOAD_FROM_API':
      // Replace state without affecting history
      return {
        past: [],
        present: action.payload,
        future: [],
      };

    case 'RESET':
      return createInitialHistory();

    default: {
      const newState = stateReducer(present, action);
      
      // If state didn't change, don't update history
      if (newState === present) return history;

      // If this is a committing action (structural change), add to history
      if (isCommittingAction(action as CommittingAction)) {
        const newPast = [...past, present].slice(-MAX_HISTORY_SIZE);
        return {
          past: newPast,
          present: newState,
          future: [], // Clear future on new change
        };
      }

      // Non-committing action: update present without history
      return {
        ...history,
        present: newState,
      };
    }
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseGameBuilderOptions {
  gameId?: string;
  onSave?: (state: GameBuilderState) => Promise<void>;
  autosaveDelay?: number;
}

export interface UseGameBuilderReturn {
  // State
  state: GameBuilderState;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  commitToHistory: () => void;
  
  // Dirty tracking
  isDirty: boolean;
  markClean: () => void;
  
  // Dispatch
  dispatch: React.Dispatch<BuilderAction>;
  
  // Convenience setters (wrap dispatch for easier use)
  // Supports both direct value and callback pattern: setCore({name: 'x'}) or setCore(prev => ({...prev, name: 'x'}))
  setCore: (update: Partial<CoreForm> | ((prev: CoreForm) => Partial<CoreForm>)) => void;
  setSteps: (steps: StepData[] | ((prev: StepData[]) => StepData[])) => void;
  setPhases: (phases: PhaseData[] | ((prev: PhaseData[]) => PhaseData[])) => void;
  setRoles: (roles: RoleData[] | ((prev: RoleData[]) => RoleData[])) => void;
  setArtifacts: (artifacts: ArtifactFormData[] | ((prev: ArtifactFormData[]) => ArtifactFormData[])) => void;
  setTriggers: (triggers: TriggerFormData[] | ((prev: TriggerFormData[]) => TriggerFormData[])) => void;
  setMaterials: (update: Partial<MaterialsForm> | ((prev: MaterialsForm) => Partial<MaterialsForm>)) => void;
  setBoardConfig: (update: Partial<BoardConfigData> | ((prev: BoardConfigData) => Partial<BoardConfigData>)) => void;
  setGameTools: (tools: GameToolForm[] | ((prev: GameToolForm[]) => GameToolForm[])) => void;
  setSubPurposeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setCover: (cover: CoverMedia | ((prev: CoverMedia) => CoverMedia)) => void;
  
  // Load from API
  loadFromApi: (state: GameBuilderState) => void;
}

export function useGameBuilder(options: UseGameBuilderOptions = {}): UseGameBuilderReturn {
  const { onSave, autosaveDelay = 1500 } = options;
  
  const [history, dispatch] = useReducer(historyReducer, undefined, createInitialHistory);
  const state = history.present;
  
  // Track if state is dirty (changed since last save)
  // We store the saved state in state to avoid ref access during render
  const [savedState, setSavedState] = useState<GameBuilderState | null>(null);
  const isDirty = savedState !== null && savedState !== state;
  
  const markClean = useCallback(() => {
    setSavedState(state);
  }, [state]);
  
  // Debounced history commit for text edits
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const scheduleCommit = useCallback(() => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
    }
    commitTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'COMMIT_TO_HISTORY' });
      commitTimeoutRef.current = null;
    }, 800); // Debounce commits by 800ms
  }, []);
  
  // Autosave effect
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (!onSave || !isDirty) return;
    
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    autosaveTimeoutRef.current = setTimeout(() => {
      void onSave(state).then(() => {
        markClean();
      });
      autosaveTimeoutRef.current = null;
    }, autosaveDelay);
    
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [state, onSave, autosaveDelay, isDirty, markClean]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (commitTimeoutRef.current) clearTimeout(commitTimeoutRef.current);
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, []);
  
  // History controls
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);
  
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);
  
  const commitToHistory = useCallback(() => {
    dispatch({ type: 'COMMIT_TO_HISTORY' });
  }, []);
  
  // Convenience setters - support both direct value and callback pattern
  // We need a ref to access current state in callbacks without causing re-renders
  const stateRef = useRef(state);
  
  // Keep stateRef in sync with state (must be in useEffect, not during render)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  const setCore = useCallback((update: Partial<CoreForm> | ((prev: CoreForm) => Partial<CoreForm>)) => {
    const payload = typeof update === 'function' ? update(stateRef.current.core) : update;
    dispatch({ type: 'SET_CORE', payload });
    scheduleCommit(); // Debounce commit for text fields
  }, [scheduleCommit]);
  
  const setSteps = useCallback((steps: StepData[] | ((prev: StepData[]) => StepData[])) => {
    const payload = typeof steps === 'function' ? steps(stateRef.current.steps) : steps;
    dispatch({ type: 'SET_STEPS', payload });
  }, []);
  
  const setPhases = useCallback((phases: PhaseData[] | ((prev: PhaseData[]) => PhaseData[])) => {
    const payload = typeof phases === 'function' ? phases(stateRef.current.phases) : phases;
    dispatch({ type: 'SET_PHASES', payload });
  }, []);
  
  const setRoles = useCallback((roles: RoleData[] | ((prev: RoleData[]) => RoleData[])) => {
    const payload = typeof roles === 'function' ? roles(stateRef.current.roles) : roles;
    dispatch({ type: 'SET_ROLES', payload });
  }, []);
  
  const setArtifacts = useCallback((artifacts: ArtifactFormData[] | ((prev: ArtifactFormData[]) => ArtifactFormData[])) => {
    const payload = typeof artifacts === 'function' ? artifacts(stateRef.current.artifacts) : artifacts;
    dispatch({ type: 'SET_ARTIFACTS', payload });
  }, []);
  
  const setTriggers = useCallback((triggers: TriggerFormData[] | ((prev: TriggerFormData[]) => TriggerFormData[])) => {
    const payload = typeof triggers === 'function' ? triggers(stateRef.current.triggers) : triggers;
    dispatch({ type: 'SET_TRIGGERS', payload });
  }, []);
  
  const setMaterials = useCallback((update: Partial<MaterialsForm> | ((prev: MaterialsForm) => Partial<MaterialsForm>)) => {
    const payload = typeof update === 'function' ? update(stateRef.current.materials) : update;
    dispatch({ type: 'SET_MATERIALS', payload });
    scheduleCommit();
  }, [scheduleCommit]);
  
  const setBoardConfig = useCallback((update: Partial<BoardConfigData> | ((prev: BoardConfigData) => Partial<BoardConfigData>)) => {
    const payload = typeof update === 'function' ? update(stateRef.current.boardConfig) : update;
    dispatch({ type: 'SET_BOARD_CONFIG', payload });
  }, []);
  
  const setGameTools = useCallback((tools: GameToolForm[] | ((prev: GameToolForm[]) => GameToolForm[])) => {
    const payload = typeof tools === 'function' ? tools(stateRef.current.gameTools) : tools;
    dispatch({ type: 'SET_GAME_TOOLS', payload });
  }, []);
  
  const setSubPurposeIds = useCallback((ids: string[] | ((prev: string[]) => string[])) => {
    const payload = typeof ids === 'function' ? ids(stateRef.current.subPurposeIds) : ids;
    dispatch({ type: 'SET_SUB_PURPOSE_IDS', payload });
  }, []);
  
  const setCover = useCallback((cover: CoverMedia | ((prev: CoverMedia) => CoverMedia)) => {
    const payload = typeof cover === 'function' ? cover(stateRef.current.cover) : cover;
    dispatch({ type: 'SET_COVER', payload });
  }, []);
  
  const loadFromApi = useCallback((newState: GameBuilderState) => {
    dispatch({ type: 'LOAD_FROM_API', payload: newState });
    setSavedState(newState);
  }, []);
  
  return useMemo(() => ({
    state,
    canUndo,
    canRedo,
    undo,
    redo,
    commitToHistory,
    isDirty,
    markClean,
    dispatch,
    setCore,
    setSteps,
    setPhases,
    setRoles,
    setArtifacts,
    setTriggers,
    setMaterials,
    setBoardConfig,
    setGameTools,
    setSubPurposeIds,
    setCover,
    loadFromApi,
  }), [
    state,
    canUndo,
    canRedo,
    undo,
    redo,
    commitToHistory,
    isDirty,
    markClean,
    dispatch,
    setCore,
    setSteps,
    setPhases,
    setRoles,
    setArtifacts,
    setTriggers,
    setMaterials,
    setBoardConfig,
    setGameTools,
    setSubPurposeIds,
    setCover,
    loadFromApi,
  ]);
}
