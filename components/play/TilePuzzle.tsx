'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/solid';
import type {
  TilePuzzleConfig,
  TilePuzzleState,
  Tile,
  TilePosition,
} from '@/types/puzzle-modules';
import { parseGridSize, isTilePuzzleSolved } from '@/types/puzzle-modules';

// ============================================================================
// TilePuzzle – Drag-and-drop tile/jigsaw puzzle
// ============================================================================

export interface TilePuzzleProps {
  config: TilePuzzleConfig;
  state: TilePuzzleState;
  onTileMove: (tileId: string, newPosition: TilePosition) => void;
  onComplete?: () => void;
  className?: string;
}

export function TilePuzzle({
  config,
  state,
  onTileMove,
  onComplete,
  className = '',
}: TilePuzzleProps) {
  const [draggedTile, setDraggedTile] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const { rows, cols } = parseGridSize(config.gridSize);
  const imageSrc = config.imageUrl || `/api/artifacts/${config.imageArtifactId}`;

  // Check for completion
  useEffect(() => {
    if (state.isComplete && !justCompleted) {
      setJustCompleted(true);
      onComplete?.();
    }
  }, [state.isComplete, justCompleted, onComplete]);

  // Get tile at position
  const getTileAtPosition = useCallback(
    (row: number, col: number): Tile | undefined => {
      return state.tiles.find(
        t => t.currentPosition.row === row && t.currentPosition.col === col
      );
    },
    [state.tiles]
  );

  // Handle drag start
  const handleDragStart = (tileId: string) => {
    setDraggedTile(tileId);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle drop
  const handleDrop = (targetRow: number, targetCol: number) => {
    if (!draggedTile) return;

    const draggedTileData = state.tiles.find(t => t.id === draggedTile);
    if (!draggedTileData) return;

    // Find tile at target position (if any)
    const targetTile = getTileAtPosition(targetRow, targetCol);

    if (targetTile) {
      // Swap tiles
      onTileMove(targetTile.id, draggedTileData.currentPosition);
    }

    onTileMove(draggedTile, { row: targetRow, col: targetCol });
    setDraggedTile(null);
  };

  // Touch handling for mobile
  const handleTouchStart = (tileId: string) => {
    setDraggedTile(tileId);
  };

  const handleTouchEnd = (targetRow: number, targetCol: number) => {
    if (!draggedTile) return;
    handleDrop(targetRow, targetCol);
  };

  // Calculate tile size based on container
  const tileSize = useMemo(() => {
    return { width: `${100 / cols}%`, height: `${100 / rows}%` };
  }, [rows, cols]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Drag: {state.moveCount}
        </div>
        
        {config.showPreview && (
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            {showPreview ? (
              <>
                <EyeSlashIcon className="h-4 w-4" />
                Dölj facit
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4" />
                Visa facit
              </>
            )}
          </button>
        )}
      </div>

      {/* Preview image (optional) */}
      {showPreview && (
        <div className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
          <img
            src={imageSrc}
            alt="Facitbild"
            className="w-full h-auto opacity-80"
          />
        </div>
      )}

      {/* Puzzle grid */}
      <div
        className="relative aspect-square rounded-lg overflow-hidden border-2 border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: '2px',
        }}
      >
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const tile = getTileAtPosition(row, col);
            const isCorrect =
              tile &&
              tile.currentPosition.row === tile.correctPosition.row &&
              tile.currentPosition.col === tile.correctPosition.col;

            return (
              <div
                key={`${row}-${col}`}
                className={`relative bg-zinc-200 dark:bg-zinc-700 ${
                  draggedTile ? 'cursor-pointer' : ''
                } ${isCorrect ? 'ring-2 ring-green-500 ring-inset' : ''}`}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(row, col)}
                onTouchEnd={() => handleTouchEnd(row, col)}
              >
                {tile && (
                  <div
                    draggable
                    onDragStart={() => handleDragStart(tile.id)}
                    onTouchStart={() => handleTouchStart(tile.id)}
                    className={`absolute inset-0 cursor-grab active:cursor-grabbing transition-transform ${
                      draggedTile === tile.id
                        ? 'opacity-50 scale-95'
                        : 'hover:scale-[1.02]'
                    }`}
                    style={{
                      backgroundImage: `url(${imageSrc})`,
                      backgroundSize: `${cols * 100}% ${rows * 100}%`,
                      backgroundPosition: `${
                        (tile.correctPosition.col / (cols - 1)) * 100
                      }% ${(tile.correctPosition.row / (rows - 1)) * 100}%`,
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Completion message */}
      {state.isComplete && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
          <CheckCircleIcon className="h-6 w-6" />
          <span className="font-medium">
            Pusslet är klart! ({state.moveCount} drag)
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// useTilePuzzle – Hook for managing tile puzzle state
// ============================================================================

export function useTilePuzzle(config: TilePuzzleConfig) {
  const { rows, cols } = parseGridSize(config.gridSize);

  // Initialize tiles
  const createTiles = useCallback((): Tile[] => {
    const tiles: Tile[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        tiles.push({
          id: `tile-${row}-${col}`,
          correctPosition: { row, col },
          currentPosition: { row, col },
        });
      }
    }
    return tiles;
  }, [rows, cols]);

  // Shuffle tiles (Fisher-Yates)
  const shuffleTiles = useCallback((tiles: Tile[]): Tile[] => {
    const positions = tiles.map(t => ({ ...t.currentPosition }));
    
    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    return tiles.map((tile, index) => ({
      ...tile,
      currentPosition: positions[index],
    }));
  }, []);

  const [state, setState] = useState<TilePuzzleState>(() => {
    let tiles = createTiles();
    if (config.shuffleOnStart) {
      tiles = shuffleTiles(tiles);
    }
    return {
      tiles,
      isComplete: !config.shuffleOnStart,
      moveCount: 0,
      startedAt: new Date().toISOString(),
    };
  });

  const handleTileMove = useCallback(
    (tileId: string, newPosition: TilePosition) => {
      setState(prev => {
        const newTiles = prev.tiles.map(tile =>
          tile.id === tileId
            ? { ...tile, currentPosition: newPosition }
            : tile
        );

        const isComplete = isTilePuzzleSolved(newTiles);

        return {
          ...prev,
          tiles: newTiles,
          moveCount: prev.moveCount + 1,
          isComplete,
          completedAt: isComplete ? new Date().toISOString() : undefined,
        };
      });
    },
    []
  );

  const reset = useCallback(() => {
    let tiles = createTiles();
    if (config.shuffleOnStart) {
      tiles = shuffleTiles(tiles);
    }
    setState({
      tiles,
      isComplete: !config.shuffleOnStart,
      moveCount: 0,
      startedAt: new Date().toISOString(),
    });
  }, [config.shuffleOnStart, createTiles, shuffleTiles]);

  return { state, handleTileMove, reset };
}
