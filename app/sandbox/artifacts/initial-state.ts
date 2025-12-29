import type { SandboxArtifactScenario } from './registry';
import type {
  CipherState,
  CounterConfig,
  CounterState,
  HintConfig,
  HintState,
  HotspotConfig,
  HotspotState,
  LocationCheckState,
  LogicGridState,
  MultiAnswerConfig,
  MultiAnswerState,
  PropConfirmationState,
  ReplayMarkerState,
  RiddleState,
  ScanGateState,
  SoundLevelState,
  TilePuzzleConfig,
  TilePuzzleState,
  Tile,
} from '@/types/puzzle-modules';
import { parseGridSize } from '@/types/puzzle-modules';

export type SandboxArtifactRuntimeState =
  | { kind: 'none' }
  | { kind: 'keypad'; state: { isSolved: boolean } }
  | { kind: 'riddle'; state: RiddleState }
  | { kind: 'cipher'; state: CipherState }
  | { kind: 'qr_gate'; state: ScanGateState }
  | { kind: 'hint_container'; state: HintState }
  | { kind: 'hotspot'; state: HotspotState }
  | { kind: 'tile_puzzle'; state: TilePuzzleState }
  | { kind: 'logic_grid'; state: LogicGridState }
  | { kind: 'counter'; state: CounterState }
  | { kind: 'location_check'; state: LocationCheckState }
  | { kind: 'prop_confirmation'; state: PropConfirmationState }
  | { kind: 'replay_marker'; state: ReplayMarkerState }
  | { kind: 'sound_level'; state: SoundLevelState }
  | { kind: 'multi_answer'; state: MultiAnswerState };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createInitialTileState(config: TilePuzzleConfig): TilePuzzleState {
  const { rows, cols } = parseGridSize(config.gridSize);

  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        id: `tile-${r}-${c}`,
        correctPosition: { row: r, col: c },
        currentPosition: { row: r, col: c },
      });
    }
  }

  if (config.shuffleOnStart) {
    const positions = shuffle(tiles.map((t) => t.currentPosition));
    for (let i = 0; i < tiles.length; i++) {
      tiles[i] = { ...tiles[i], currentPosition: positions[i] };
    }
  }

  return {
    tiles,
    isComplete: false,
    moveCount: 0,
    startedAt: new Date().toISOString(),
  };
}

export function createInitialRuntimeStateForScenario(
  scenario: SandboxArtifactScenario,
  configOverride?: unknown
): SandboxArtifactRuntimeState {
  const parsedOverride =
    configOverride === undefined
      ? null
      : scenario.configSchema.safeParse(configOverride);
  const config: unknown =
    parsedOverride && parsedOverride.success ? parsedOverride.data : scenario.defaultConfig;

  switch (scenario.artifactType) {
    case 'keypad':
      return { kind: 'keypad', state: { isSolved: false } };

    case 'riddle':
      return {
        kind: 'riddle',
        state: {
          isCorrect: false,
          attemptsUsed: 0,
          attempts: [],
          showHint: false,
        },
      };

    case 'cipher':
      return {
        kind: 'cipher',
        state: {
          currentGuess: '',
          isDecoded: false,
          attemptsUsed: 0,
        },
      };

    case 'qr_gate':
      return {
        kind: 'qr_gate',
        state: {
          isVerified: false,
          usedFallback: false,
          scanAttempts: 0,
        },
      };

    case 'hint_container': {
      const hintConfig = config as HintConfig;
      return {
        kind: 'hint_container',
        state: {
          revealedHintIds: [],
          cooldownRemaining: 0,
          hintsAvailable: hintConfig.hints.length,
          totalPenaltyTime: 0,
          totalPenaltyPoints: 0,
        },
      };
    }

    case 'hotspot': {
      const hotspotConfig = config as HotspotConfig;
      const requiredHotspots = hotspotConfig.hotspots.filter((h) => h.required !== false);
      const requiredCount = hotspotConfig.requireAll
        ? requiredHotspots.length
        : requiredHotspots.length;
      return {
        kind: 'hotspot',
        state: {
          foundHotspotIds: [],
          isComplete: false,
          foundCount: 0,
          requiredCount,
        },
      };
    }

    case 'tile_puzzle':
      return { kind: 'tile_puzzle', state: createInitialTileState(config as TilePuzzleConfig) };

    case 'logic_grid':
      return {
        kind: 'logic_grid',
        state: {
          cells: [],
          revealedClueIds: [],
          isSolved: false,
          moveCount: 0,
          startedAt: new Date().toISOString(),
        },
      };

    case 'counter': {
      const counterConfig = config as CounterConfig;
      const currentValue = counterConfig.initialValue ?? 0;
      return {
        kind: 'counter',
        state: {
          key: counterConfig.key,
          currentValue,
          target: counterConfig.target,
          isComplete: currentValue >= counterConfig.target,
        },
      };
    }

    case 'location_check':
      return { kind: 'location_check', state: { isVerified: false } };

    case 'prop_confirmation':
      return { kind: 'prop_confirmation', state: { status: 'pending' } };

    case 'replay_marker':
      return { kind: 'replay_marker', state: { markers: [] } };

    case 'sound_level':
      return {
        kind: 'sound_level',
        state: {
          currentLevel: 0,
          peakLevel: 0,
          isTriggered: false,
          sustainedSeconds: 0,
        },
      };

    case 'multi_answer': {
      const multiConfig = config as MultiAnswerConfig;
      return {
        kind: 'multi_answer',
        state: {
          results: [],
          isComplete: false,
          passedCount: 0,
          totalCount: multiConfig.checks.length,
        },
      };
    }

    default:
      return { kind: 'none' };
  }
}
