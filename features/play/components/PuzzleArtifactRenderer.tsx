'use client';

/**
 * PuzzleArtifactRenderer Component
 * 
 * Renders puzzle artifacts based on their type.
 * Acts as a dispatcher for all puzzle module components.
 * 
 * Each component uses config/state patterns from @/types/puzzle-modules.
 * Integrates with real-time sync via usePuzzleRealtime hook.
 */

import { useCallback, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RiddleInput,
  CounterDisplay,
  AudioPlayer,
  MultiAnswerForm,
  QRScanner,
  HintPanel,
  HotspotImage,
  TilePuzzle,
  CipherDecoder,
  PropRequest,
  LocationCheck,
  LogicGrid,
  SoundLevelMeter,
} from '@/components/play';
import { usePuzzleRealtime } from '@/features/play/hooks';
import type { ArtifactType } from '@/types/games';
import type {
  RiddleConfig,
  RiddleState,
  AudioConfig,
  AudioState,
  MultiAnswerConfig,
  MultiAnswerState,
  ScanGateConfig,
  ScanGateState,
  HintConfig,
  HintState,
  HotspotConfig,
  HotspotState,
  TilePuzzleConfig,
  TilePuzzleState,
  CipherConfig,
  CipherState,
  LogicGridConfig,
  LogicGridState,
  PropConfirmationConfig,
  PropConfirmationState,
  LocationCheckConfig,
  LocationCheckState,
  SoundLevelConfig,
  SoundLevelState,
  Tile,
  LogicGridCell,
  GeoCoordinate,
} from '@/types/puzzle-modules';

// =============================================================================
// Types
// =============================================================================

export interface PuzzleArtifactData {
  id: string;
  title: string | null;
  description: string | null;
  artifact_type: string | null;
  artifact_order?: number;
  metadata?: Record<string, unknown> | null;
}

export interface PuzzleState {
  solved?: boolean;
  locked?: boolean;
  currentValue?: number;
  checked?: string[];
  verified?: boolean;
  // Add more as needed
  [key: string]: unknown;
}

export interface PuzzleArtifactRendererProps {
  artifact: PuzzleArtifactData;
  sessionId: string;
  participantToken: string;
  participantId?: string;
  teamId?: string;
  /** Enable real-time sync (default: true) */
  enableRealtime?: boolean;
  onStateChange?: () => void;
}

// =============================================================================
// API Helpers
// =============================================================================

async function submitPuzzle(
  sessionId: string,
  artifactId: string,
  body: Record<string, unknown>,
  participantToken: string
) {
  const res = await fetch(`/api/play/sessions/${sessionId}/artifacts/${artifactId}/puzzle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-participant-token': participantToken,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// =============================================================================
// Component
// =============================================================================

export function PuzzleArtifactRenderer({
  artifact,
  sessionId,
  participantToken,
  participantId,
  teamId,
  enableRealtime = true,
  onStateChange,
}: PuzzleArtifactRendererProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Initial state from artifact metadata
  const initialPuzzleState = useMemo(() => 
    (artifact.metadata?.puzzleState as PuzzleState) || {},
    [artifact.metadata?.puzzleState]
  );

  // Real-time puzzle state sync
  const {
    state: realtimeState,
    connected: realtimeConnected,
    updateState: updateRealtimeState,
    broadcastStateChange,
    isSolved: _isSolved,
    isLocked,
  } = usePuzzleRealtime({
    sessionId,
    artifactId: artifact.id,
    participantId,
    teamId,
    initialState: initialPuzzleState,
    onStateChange: onStateChange ? () => onStateChange() : undefined,
    onSolved: onStateChange ? () => onStateChange() : undefined,
    enabled: enableRealtime,
  });

  // Use realtime state if enabled, otherwise local state
  const [localPuzzleState, setLocalPuzzleState] = useState<PuzzleState>(initialPuzzleState);
  const puzzleState = enableRealtime ? (realtimeState as PuzzleState) : localPuzzleState;
  
  // Memoize setPuzzleState to avoid changing dependency on every render
  const setPuzzleState = useMemo(() => {
    if (enableRealtime) {
      return (state: PuzzleState | ((prev: PuzzleState) => PuzzleState)) => {
        const newState = typeof state === 'function' ? state(puzzleState) : state;
        updateRealtimeState(newState);
      };
    }
    return setLocalPuzzleState;
  }, [enableRealtime, puzzleState, updateRealtimeState]);

  const meta = artifact.metadata || {};
  const artifactType = artifact.artifact_type as ArtifactType | null;

  // Generic submit handler
  const handleSubmit = useCallback(
    async (puzzleType: string, payload: Record<string, unknown>) => {
      // Don't allow submission if locked
      if (isLocked) {
        setMessage({ type: 'error', text: 'Pusslet är låst av spelledaren' });
        return;
      }
      
      setLoading(true);
      setMessage(null);
      try {
        const result = await submitPuzzle(sessionId, artifact.id, { puzzleType, ...payload }, participantToken);
        if (result.state) {
          const newState = result.state as PuzzleState;
          setPuzzleState(newState);
          
          // Broadcast state change if realtime is enabled
          if (enableRealtime && realtimeConnected) {
            await broadcastStateChange(newState);
          }
        }
        setMessage({
          type: result.status === 'success' || result.status === 'already_solved' ? 'success' : 'error',
          text: result.message,
        });
        if (result.status === 'success') {
          onStateChange?.();
        }
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Serverfel' });
      } finally {
        setLoading(false);
      }
    },
    [sessionId, artifact.id, participantToken, onStateChange, isLocked, enableRealtime, realtimeConnected, broadcastStateChange, setPuzzleState]
  );

  // ==========================================================================
  // Riddle
  // ==========================================================================
  if (artifactType === 'riddle') {
    // Build config from metadata
    const promptText = (meta.prompt as string) || (meta.promptText as string) || '';
    const riddleConfig: RiddleConfig = {
      acceptedAnswers: (meta.correctAnswers as string[]) || (meta.acceptedAnswers as string[]) || [meta.correctAnswer as string].filter(Boolean),
      normalizeMode: (meta.normalizeMode as RiddleConfig['normalizeMode']) || 'fuzzy',
      maxAttempts: typeof meta.maxAttempts === 'number' ? meta.maxAttempts : undefined,
      hintText: meta.hintText as string | undefined,
      showHintAfterAttempts: typeof meta.showHintAfterAttempts === 'number' ? meta.showHintAfterAttempts : undefined,
      promptText,
    };

    // Build state from puzzleState
    const riddleState: RiddleState = {
      isCorrect: puzzleState.solved === true,
      attemptsUsed: (puzzleState.attempts as unknown[])?.length ?? 0,
      attempts: (puzzleState.attempts as Array<{ answer: string; correct: boolean; timestamp: string }>) || [],
      showHint: puzzleState.showHint === true,
    };

    const isLocked = riddleConfig.maxAttempts !== undefined && riddleState.attemptsUsed >= riddleConfig.maxAttempts;

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">❓</span>
            <p className="font-medium">{artifact.title || 'Gåta'}</p>
          </div>
          <Badge variant={riddleState.isCorrect ? 'default' : isLocked ? 'destructive' : 'secondary'}>
            {riddleState.isCorrect ? 'Löst' : isLocked ? 'Låst' : 'Olöst'}
          </Badge>
        </div>
        {promptText && <p className="text-sm text-muted-foreground italic">{promptText}</p>}

        {riddleState.isCorrect ? (
          <div className="rounded bg-green-500/10 border border-green-500/30 p-3 text-center">
            <p className="text-sm font-medium text-green-600">✓ Rätt svar!</p>
          </div>
        ) : isLocked ? (
          <div className="rounded bg-destructive/10 border border-destructive/30 p-3 text-center">
            <p className="text-sm text-destructive">🔒 Låst - för många försök</p>
          </div>
        ) : (
          <RiddleInput
            config={riddleConfig}
            state={riddleState}
            onSubmit={(answer) => handleSubmit('riddle', { answer })}
            onCorrect={() => onStateChange?.()}
            disabled={loading}
          />
        )}

        {message && (
          <p className={`text-xs text-center ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {message.text}
          </p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Counter
  // ==========================================================================
  if (artifactType === 'counter') {
    const target = typeof meta.target === 'number' ? meta.target : 1;
    const label = (meta.label as string) || 'Räknare';
    const currentValue = typeof puzzleState.currentValue === 'number' ? puzzleState.currentValue : 0;
    const isCompleted = puzzleState.completed === true || currentValue >= target;

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔢</span>
            <p className="font-medium">{artifact.title || label}</p>
          </div>
          {isCompleted && <Badge variant="default">Klart!</Badge>}
        </div>

        <div className="flex items-center justify-center gap-4">
          <CounterDisplay value={currentValue} target={target} label={label} isComplete={isCompleted} />
        </div>

        {!isCompleted && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit('counter', { action: 'decrement' })}
              disabled={loading || currentValue <= 0}
            >
              −
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSubmit('counter', { action: 'increment' })}
              disabled={loading}
            >
              +
            </Button>
          </div>
        )}

        {message && (
          <p className={`text-xs text-center ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {message.text}
          </p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Audio
  // ==========================================================================
  if (artifactType === 'audio') {
    const audioUrl = (meta.audioUrl as string) || (meta.src as string) || '';
    const audioConfig: Partial<AudioConfig> = {
      autoPlay: meta.autoplay === true || meta.autoPlay === true,
      loop: meta.loop === true,
      requireAck: meta.requireAck === true,
      showTranscript: meta.showTranscript === true,
      transcriptText: (meta.transcript as string) || (meta.transcriptText as string),
    };
    const audioState: AudioState = {
      isPlaying: false,
      hasPlayed: puzzleState.hasPlayed === true,
      hasAcknowledged: puzzleState.acknowledged === true,
    };

    if (!audioUrl) {
      return (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Ljudklipp ej konfigurerat</p>
        </Card>
      );
    }

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔊</span>
          <p className="font-medium">{artifact.title || 'Ljudklipp'}</p>
        </div>

        <AudioPlayer
          src={audioUrl}
          config={audioConfig}
          state={audioState}
          title={artifact.title || undefined}
          onAcknowledge={() => {
            setPuzzleState((prev) => ({ ...prev, acknowledged: true, hasPlayed: true }));
            onStateChange?.();
          }}
        />

        {audioConfig.requireAck && audioState.hasAcknowledged && (
          <p className="text-xs text-green-600 text-center">✓ Lyssnat</p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Multi-Answer (Checklist)
  // ==========================================================================
  if (artifactType === 'multi_answer') {
    // Build config from metadata
    const checks = (meta.checks as MultiAnswerConfig['checks']) || 
      (meta.items as string[])?.map((label, i) => ({
        id: String(i),
        type: 'checkbox' as const,
        label,
        required: true,
      })) || [];
    
    const multiConfig: MultiAnswerConfig = {
      checks,
      requireAll: meta.requireAll !== false,
      showProgress: meta.showProgress !== false,
    };

    const multiState: MultiAnswerState = {
      results: (puzzleState.results as MultiAnswerState['results']) || [],
      isComplete: puzzleState.completed === true,
      passedCount: (puzzleState.checked as string[])?.length || 0,
      totalCount: checks.length,
    };

    const requiredCount = typeof meta.requiredCount === 'number' ? meta.requiredCount : checks.length;

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <p className="font-medium">{artifact.title || 'Checklista'}</p>
          </div>
          <Badge variant={multiState.isComplete ? 'default' : 'secondary'}>
            {multiState.passedCount}/{requiredCount}
          </Badge>
        </div>

        <MultiAnswerForm
          config={multiConfig}
          state={multiState}
          onCheckResult={(checkId, passed) => handleSubmit('multi_answer', { checkId, passed })}
          onComplete={() => onStateChange?.()}
          disabled={loading || multiState.isComplete}
        />

        {multiState.isComplete && (
          <p className="text-xs text-green-600 text-center">✓ Alla klara!</p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // QR Gate
  // ==========================================================================
  if (artifactType === 'qr_gate') {
    // Build config from metadata
    const expectedValue = (meta.expectedValue as string) || (meta.correctAnswer as string) || '';
    const qrConfig: ScanGateConfig = {
      mode: (meta.mode as ScanGateConfig['mode']) || 'qr',
      allowedValues: (meta.allowedValues as string[]) || [expectedValue].filter(Boolean),
      fallbackCode: meta.fallbackCode as string | undefined,
      allowManualFallback: meta.allowManualFallback !== false,
      promptText: (meta.instruction as string) || (meta.promptText as string) || 'Skanna QR-koden',
    };

    const qrState: ScanGateState = {
      isVerified: puzzleState.verified === true,
      usedFallback: puzzleState.usedFallback === true,
      scanAttempts: typeof puzzleState.scanAttempts === 'number' ? puzzleState.scanAttempts : 0,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📱</span>
            <p className="font-medium">{artifact.title || 'Skanna QR-kod'}</p>
          </div>
          {qrState.isVerified && <Badge variant="default">Verifierad</Badge>}
        </div>

        {qrState.isVerified ? (
          <div className="rounded bg-green-500/10 border border-green-500/30 p-3 text-center">
            <p className="text-sm font-medium text-green-600">✓ QR-kod verifierad!</p>
          </div>
        ) : (
          <QRScanner
            config={qrConfig}
            state={qrState}
            onSuccess={(value) => handleSubmit('qr_gate', { answer: value })}
            disabled={loading}
          />
        )}

        {message && (
          <p className={`text-xs text-center ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {message.text}
          </p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Hint Container
  // ==========================================================================
  if (artifactType === 'hint_container') {
    // Build config from metadata
    const hintsData = (meta.hints as Array<{ id?: string; text: string; penaltySeconds?: number }>) || 
      (meta.hints as string[])?.map((text, i) => ({ id: String(i), text })) || [];
    
    const hintConfig: HintConfig = {
      hints: hintsData.map((h, i) => ({
        id: h.id || String(i),
        content: h.text || (h as unknown as string),
        penaltySeconds: h.penaltySeconds || (meta.penaltyPerHint as number) || 0,
      })),
      maxHints: typeof meta.maxHints === 'number' ? meta.maxHints : hintsData.length,
      cooldownSeconds: typeof meta.cooldownSeconds === 'number' ? meta.cooldownSeconds : 0,
    };

    const revealedCount = typeof puzzleState.revealedCount === 'number' ? puzzleState.revealedCount : 0;
    const hintState: HintState = {
      revealedHintIds: (puzzleState.revealedHintIds as string[]) || 
        hintConfig.hints.slice(0, revealedCount).map(h => h.id),
      totalPenaltyTime: typeof puzzleState.totalPenaltyTime === 'number' ? puzzleState.totalPenaltyTime : 0,
      totalPenaltyPoints: typeof puzzleState.totalPenaltyPoints === 'number' ? puzzleState.totalPenaltyPoints : 0,
      cooldownRemaining: typeof puzzleState.cooldownRemaining === 'number' ? puzzleState.cooldownRemaining : 0,
      hintsAvailable: hintConfig.hints.length - revealedCount,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <p className="font-medium">{artifact.title || 'Tips'}</p>
          </div>
          <Badge variant="secondary">
            {hintState.revealedHintIds.length}/{hintConfig.hints.length} tips
          </Badge>
        </div>

        <HintPanel
          config={hintConfig}
          state={hintState}
          onRequestHint={(hintId) => {
            // Local state update + could call API
            setPuzzleState((prev) => ({
              ...prev,
              revealedCount: (prev.revealedCount as number ?? 0) + 1,
              revealedHintIds: [...(prev.revealedHintIds as string[] ?? []), hintId],
            }));
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Hotspot Image
  // ==========================================================================
  if (artifactType === 'hotspot') {
    const imageUrl = (meta.imageUrl as string) || '';
    const zones = (meta.zones as Array<{ id: string; x: number; y: number; radius: number; label?: string; required?: boolean }>) || 
      (meta.hotspots as Array<{ id: string; x: number; y: number; radius: number; label?: string; required?: boolean }>) || [];
    
    const hotspotConfig: HotspotConfig = {
      imageArtifactId: (meta.imageArtifactId as string) || '',
      imageUrl,
      hotspots: zones.map((z, i) => ({
        id: z.id || String(i),
        x: z.x,
        y: z.y,
        radius: z.radius || 10,
        label: z.label,
        required: z.required !== false,
      })),
      showProgress: meta.showFeedback !== false || meta.showProgress !== false,
      hapticFeedback: meta.hapticFeedback !== false,
      requireAll: meta.requireAll !== false,
    };

    const foundIds = (puzzleState.foundIds as string[]) || (puzzleState.foundHotspotIds as string[]) || [];
    const requiredHotspots = hotspotConfig.hotspots.filter(h => h.required !== false);
    const hotspotState: HotspotState = {
      foundHotspotIds: foundIds,
      isComplete: foundIds.length >= requiredHotspots.length,
      foundCount: foundIds.length,
      requiredCount: requiredHotspots.length,
    };

    const requiredCount = hotspotConfig.hotspots.filter(h => h.required !== false).length;
    const isComplete = foundIds.length >= requiredCount;

    if (!imageUrl) {
      return (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Hotspot-bild ej konfigurerad</p>
        </Card>
      );
    }

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <p className="font-medium">{artifact.title || 'Hitta i bilden'}</p>
          </div>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {foundIds.length}/{requiredCount}
          </Badge>
        </div>

        <HotspotImage
          config={hotspotConfig}
          state={hotspotState}
          onHotspotFound={(hotspotId) => {
            if (!foundIds.includes(hotspotId)) {
              setPuzzleState((prev) => ({
                ...prev,
                foundHotspotIds: [...(prev.foundHotspotIds as string[] ?? []), hotspotId],
                foundIds: [...(prev.foundIds as string[] ?? []), hotspotId],
              }));
            }
          }}
          onComplete={() => onStateChange?.()}
        />

        {isComplete && (
          <p className="text-xs text-green-600 text-center">✓ Alla hittade!</p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Tile Puzzle
  // ==========================================================================
  if (artifactType === 'tile_puzzle') {
    const imageUrl = (meta.imageUrl as string) || '';
    const gridSizeRaw = (meta.gridSize as string) || `${meta.rows || 3}x${meta.cols || 3}`;
    // Validate and default to 3x3 if invalid
    const validSizes: TilePuzzleConfig['gridSize'][] = ['2x2', '3x3', '4x4', '3x2', '4x3'];
    const gridSize = validSizes.includes(gridSizeRaw as TilePuzzleConfig['gridSize']) 
      ? (gridSizeRaw as TilePuzzleConfig['gridSize']) 
      : '3x3';
    
    const tileConfig: TilePuzzleConfig = {
      imageArtifactId: (meta.imageArtifactId as string) || '',
      imageUrl,
      gridSize,
      showPreview: meta.showPreview === true || meta.allowPreview === true,
    };

    // Build tile state (if stored, otherwise we let component handle it)
    const tiles = (puzzleState.tiles as Tile[]) || [];
    const tileState: TilePuzzleState = {
      tiles,
      moveCount: typeof puzzleState.moveCount === 'number' ? puzzleState.moveCount : 0,
      isComplete: puzzleState.solved === true,
    };

    if (!imageUrl) {
      return (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Pusselspel ej konfigurerat</p>
        </Card>
      );
    }

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧩</span>
            <p className="font-medium">{artifact.title || 'Pusselspel'}</p>
          </div>
          {tileState.isComplete && <Badge variant="default">Löst!</Badge>}
        </div>

        <TilePuzzle
          config={tileConfig}
          state={tileState}
          onTileMove={(tileId, newPosition) => {
            // Update local state - in full implementation would sync with server
            setPuzzleState((prev) => {
              const tiles = (prev.tiles as Tile[]) || [];
              return {
                ...prev,
                tiles: tiles.map(t => t.id === tileId ? { ...t, currentPosition: newPosition } : t),
                moveCount: ((prev.moveCount as number) ?? 0) + 1,
              };
            });
          }}
          onComplete={() => {
            setPuzzleState((prev) => ({ ...prev, solved: true }));
            onStateChange?.();
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Cipher
  // ==========================================================================
  if (artifactType === 'cipher') {
    const cipherConfig: CipherConfig = {
      cipherType: (meta.cipherMethod as CipherConfig['cipherType']) || 
                  (meta.cipherType as CipherConfig['cipherType']) || 'caesar',
      encodedMessage: (meta.encodedMessage as string) || (meta.cipherText as string) || '',
      expectedPlaintext: (meta.plaintext as string) || (meta.expectedPlaintext as string) || '',
      caesarShift: typeof meta.caesarShift === 'number' ? meta.caesarShift : 
                   typeof meta.cipherKey === 'number' ? meta.cipherKey : 3,
      substitutionMap: meta.substitutionMap as Record<string, string> | undefined,
      showDecoderUI: meta.showDecoderHelper !== false && meta.showDecoderUI !== false,
      normalizeMode: (meta.normalizeMode as CipherConfig['normalizeMode']) || 'fuzzy',
    };

    const cipherState: CipherState = {
      currentGuess: (puzzleState.currentGuess as string) || '',
      attemptsUsed: typeof puzzleState.attemptsUsed === 'number' ? puzzleState.attemptsUsed : 0,
      isDecoded: puzzleState.solved === true,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔤</span>
            <p className="font-medium">{artifact.title || 'Krypterat meddelande'}</p>
          </div>
          {cipherState.isDecoded && <Badge variant="default">Dekrypterat!</Badge>}
        </div>

        <CipherDecoder
          config={cipherConfig}
          state={cipherState}
          onGuess={(guess) => {
            setPuzzleState((prev) => ({
              ...prev,
              currentGuess: guess,
              guessCount: ((prev.guessCount as number) ?? 0) + 1,
            }));
          }}
          onDecoded={() => {
            setPuzzleState((prev) => ({ ...prev, solved: true }));
            onStateChange?.();
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Logic Grid
  // ==========================================================================
  if (artifactType === 'logic_grid') {
    // Build categories from metadata
    const categories = (meta.categories as LogicGridConfig['categories']) || 
      ((meta.rows as string[]) && (meta.columns as string[]) ? [
        { id: 'rows', name: 'Rader', items: (meta.rows as string[]) },
        { id: 'cols', name: 'Kolumner', items: (meta.columns as string[]) },
      ] : []);
    
    const logicConfig: LogicGridConfig = {
      title: (meta.title as string) || artifact.title || 'Logikpussel',
      categories,
      clues: (meta.clues as LogicGridConfig['clues']) || [],
      solution: (meta.solution as LogicGridConfig['solution']) || [],
    };

    const cells = (puzzleState.cells as LogicGridCell[]) || [];
    const logicState: LogicGridState = {
      cells,
      revealedClueIds: (puzzleState.revealedClueIds as string[]) || [],
      isSolved: puzzleState.solved === true,
      moveCount: typeof puzzleState.moveCount === 'number' ? puzzleState.moveCount : 0,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <p className="font-medium">{artifact.title || 'Logikrutnät'}</p>
          </div>
          {logicState.isSolved && <Badge variant="default">Löst!</Badge>}
        </div>

        <LogicGrid
          config={logicConfig}
          state={logicState}
          onCellChange={(cell) => {
            setPuzzleState((prev) => {
              const cells = (prev.cells as LogicGridCell[]) || [];
              const existingIdx = cells.findIndex(
                c => c.rowCategoryId === cell.rowCategoryId && 
                     c.rowItemIndex === cell.rowItemIndex &&
                     c.colCategoryId === cell.colCategoryId &&
                     c.colItemIndex === cell.colItemIndex
              );
              const newCells = existingIdx >= 0 
                ? cells.map((c, i) => i === existingIdx ? cell : c)
                : [...cells, cell];
              return { ...prev, cells: newCells };
            });
          }}
          onSolved={() => {
            setPuzzleState((prev) => ({ ...prev, solved: true }));
            onStateChange?.();
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Prop Confirmation
  // ==========================================================================
  if (artifactType === 'prop_confirmation') {
    const propConfig: PropConfirmationConfig = {
      propId: (meta.propId as string) || artifact.id,
      propDescription: (meta.propName as string) || (meta.instruction as string) || 'Föremål',
      propImageUrl: meta.propImageUrl as string | undefined,
      instructions: (meta.instructions as string) || (meta.instruction as string) || 'Visa upp föremålet för spelledaren.',
      requirePhoto: meta.requirePhoto === true,
    };

    const propState: PropConfirmationState = {
      status: puzzleState.confirmed === true ? 'confirmed' as const : 
              puzzleState.pending === true ? 'pending' as const : 'pending' as const,
      requestedAt: puzzleState.requestedAt as string | undefined,
      photoUrl: puzzleState.photoUrl as string | undefined,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <p className="font-medium">{artifact.title || propConfig.propDescription}</p>
          </div>
          <Badge variant={propState.status === 'confirmed' ? 'default' : propState.status === 'pending' ? 'secondary' : 'outline'}>
            {propState.status === 'confirmed' ? 'Bekräftad' : propState.status === 'pending' ? 'Väntar...' : 'Ej bekräftad'}
          </Badge>
        </div>

        <PropRequest
          config={propConfig}
          state={propState}
          onRequest={() => {
            setPuzzleState((prev) => ({ 
              ...prev, 
              pending: true,
              requestedAt: new Date().toISOString(),
            }));
            // Real implementation would call API
          }}
          onPhotoCapture={(photoUrl) => {
            setPuzzleState((prev) => ({ ...prev, photoUrl }));
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Location Check
  // ==========================================================================
  if (artifactType === 'location_check') {
    const latitude = typeof meta.latitude === 'number' ? meta.latitude : 0;
    const longitude = typeof meta.longitude === 'number' ? meta.longitude : 0;
    const radius = typeof meta.radius === 'number' ? meta.radius : 50;
    const locationName = (meta.locationName as string) || '';
    
    const locationConfig: LocationCheckConfig = {
      locationId: (meta.locationId as string) || artifact.id,
      locationName,
      checkType: (meta.checkType as LocationCheckConfig['checkType']) || (meta.method as LocationCheckConfig['checkType']) || 'gps',
      targetCoordinates: { latitude, longitude },
      radiusMeters: radius,
      qrCodeValue: (meta.qrCode as string) || (meta.qrCodeValue as string),
      showDistance: meta.showDistance !== false,
      showCompass: meta.showCompass !== false,
    };

    const locationState: LocationCheckState = {
      isVerified: puzzleState.verified === true,
      currentCoordinates: puzzleState.currentCoordinates as GeoCoordinate | undefined,
      distanceMeters: puzzleState.distanceMeters as number | undefined,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📍</span>
            <p className="font-medium">{artifact.title || locationName || 'Platsverifiering'}</p>
          </div>
          {locationState.isVerified && <Badge variant="default">Verifierad!</Badge>}
        </div>

        <LocationCheck
          config={locationConfig}
          state={locationState}
          onLocationUpdate={(coords) => {
            setPuzzleState((prev) => ({ ...prev, currentCoordinates: coords }));
          }}
          onVerified={() => {
            setPuzzleState((prev) => ({ ...prev, verified: true }));
            onStateChange?.();
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Sound Level
  // ==========================================================================
  if (artifactType === 'sound_level') {
    const soundInstructions = (meta.instruction as string) || (meta.instructions as string) || 'Gör ljud!';
    const soundConfig: SoundLevelConfig = {
      triggerMode: (meta.triggerMode as SoundLevelConfig['triggerMode']) || 'threshold',
      thresholdLevel: typeof meta.threshold === 'number' ? meta.threshold : 
                      typeof meta.thresholdLevel === 'number' ? meta.thresholdLevel : 70,
      sustainDuration: typeof meta.holdDuration === 'number' ? meta.holdDuration : 
                       typeof meta.sustainDuration === 'number' ? meta.sustainDuration : 2,
      activityLabel: (meta.activityLabel as string) || artifact.title || 'Ljudaktivering',
      instructions: soundInstructions,
      showMeter: meta.showMeter !== false,
    };

    const soundState: SoundLevelState = {
      currentLevel: typeof puzzleState.currentLevel === 'number' ? puzzleState.currentLevel : 0,
      peakLevel: typeof puzzleState.peakLevel === 'number' ? puzzleState.peakLevel : 0,
      isTriggered: puzzleState.triggered === true,
      sustainedSeconds: typeof puzzleState.sustainedSeconds === 'number' ? puzzleState.sustainedSeconds : 0,
    };

    return (
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎤</span>
            <p className="font-medium">{artifact.title || 'Ljudaktivering'}</p>
          </div>
          {soundState.isTriggered && <Badge variant="default">Aktiverad!</Badge>}
        </div>

        {soundInstructions && <p className="text-sm text-muted-foreground italic">{soundInstructions}</p>}

        <SoundLevelMeter
          config={soundConfig}
          state={soundState}
          onLevelChange={(level) => {
            setPuzzleState((prev) => ({ ...prev, currentLevel: level, isListening: true }));
          }}
          onTriggered={() => {
            setPuzzleState((prev) => ({ ...prev, triggered: true }));
            onStateChange?.();
          }}
        />
      </Card>
    );
  }

  // ==========================================================================
  // Replay Marker - Skip in participant view (host-only analysis)
  // ==========================================================================
  if (artifactType === 'replay_marker') {
    return null; // Replay markers are typically for post-session analysis
  }

  // ==========================================================================
  // Signal Generator (Task 2.1) - Displays signal trigger UI
  // ==========================================================================
  if (artifactType === 'signal_generator') {
    const config = (artifact.metadata as { signalConfig?: { label?: string; outputs?: string[] } })?.signalConfig;
    const label = config?.label ?? 'Signal';
    const outputs = config?.outputs ?? ['visual'];
    
    return (
      <Card className="p-4 border-l-4 border-l-primary">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-foreground">{artifact.title ?? label}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              {outputs.includes('audio') && <span>🔊</span>}
              {outputs.includes('vibration') && <span>📳</span>}
              {outputs.includes('visual') && <span>💡</span>}
              {outputs.includes('notification') && <span>🔔</span>}
              <span>{outputs.length} signalkällor</span>
            </div>
          </div>
          <Badge variant="secondary" size="sm">Signal</Badge>
        </div>
        {artifact.description && (
          <p className="text-sm text-muted-foreground mt-2">{artifact.description}</p>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Time Bank Step (Task 2.2) - Displays countdown timer
  // ==========================================================================
  if (artifactType === 'time_bank_step') {
    const config = (artifact.metadata as { 
      timerConfig?: { 
        initialSeconds?: number; 
        displayStyle?: string;
        warningThreshold?: number;
        criticalThreshold?: number;
      } 
    })?.timerConfig;
    
    const initialSeconds = config?.initialSeconds ?? 300;
    const displayStyle = config?.displayStyle ?? 'countdown';
    const warningThreshold = config?.warningThreshold ?? 60;
    const criticalThreshold = config?.criticalThreshold ?? 30;
    
    // Get remaining from state (or use initial)
    const remaining = (puzzleState as { remainingSeconds?: number })?.remainingSeconds ?? initialSeconds;
    const isPaused = (puzzleState as { isPaused?: boolean })?.isPaused ?? false;
    const isExpired = remaining <= 0;
    
    // Format time
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Determine visual state
    const isCritical = remaining <= criticalThreshold;
    const isWarning = remaining <= warningThreshold && !isCritical;
    
    return (
      <Card className={`p-6 text-center ${isCritical ? 'border-destructive bg-destructive/5' : isWarning ? 'border-warning bg-warning/5' : ''}`}>
        <div className="text-sm text-muted-foreground mb-2">
          {artifact.title ?? 'Tid kvar'}
        </div>
        <div className={`text-4xl font-mono font-bold ${isCritical ? 'text-destructive animate-pulse' : isWarning ? 'text-warning' : 'text-foreground'}`}>
          {isExpired ? '0:00' : timeDisplay}
        </div>
        {isPaused && (
          <Badge variant="warning" size="sm" className="mt-2">
            ⏸️ Pausad
          </Badge>
        )}
        {isExpired && (
          <Badge variant="destructive" size="sm" className="mt-2">
            ⏰ Tiden är ute!
          </Badge>
        )}
        {displayStyle === 'progress' && !isExpired && (
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${isCritical ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${(remaining / initialSeconds) * 100}%` }}
            />
          </div>
        )}
      </Card>
    );
  }

  // ==========================================================================
  // Empty Artifact (Task 2.3) - Placeholder or custom slot
  // ==========================================================================
  if (artifactType === 'empty_artifact') {
    const config = (artifact.metadata as { 
      emptyConfig?: { 
        purpose?: string;
        placeholderText?: string;
        backgroundColor?: string;
        minHeight?: number;
        showBorder?: boolean;
        icon?: string;
      } 
    })?.emptyConfig;
    
    const purpose = config?.purpose ?? 'placeholder';
    const placeholderText = config?.placeholderText ?? '';
    const minHeight = config?.minHeight ?? 100;
    const showBorder = config?.showBorder ?? true;
    const icon = config?.icon ?? '📦';
    
    // Host notes are not rendered for participants
    if (purpose === 'host_note') {
      return null;
    }
    
    // Break markers render as a visual divider
    if (purpose === 'break_marker') {
      return (
        <div className="py-4 flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          {placeholderText && (
            <span className="text-sm text-muted-foreground">{placeholderText}</span>
          )}
          <div className="flex-1 h-px bg-border" />
        </div>
      );
    }
    
    return (
      <Card 
        className={`flex items-center justify-center ${showBorder ? 'border-dashed border-2' : 'border-0'}`}
        style={{ 
          minHeight: `${minHeight}px`,
          backgroundColor: config?.backgroundColor ?? undefined,
        }}
      >
        <div className="text-center text-muted-foreground p-4">
          <span className="text-2xl block mb-2">{icon}</span>
          {placeholderText && <p className="text-sm">{placeholderText}</p>}
          {!placeholderText && purpose === 'placeholder' && (
            <p className="text-sm">Innehåll kommer snart...</p>
          )}
        </div>
      </Card>
    );
  }

  // ==========================================================================
  // Unsupported/Unknown artifact type
  // ==========================================================================
  return null;
}
