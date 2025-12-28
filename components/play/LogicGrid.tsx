'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  CheckCircleIcon,
  LightBulbIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import type {
  LogicGridConfig,
  LogicGridState,
  LogicGridCell,
  LogicGridCellValue,
  LogicGridCategory,
} from '@/types/puzzle-modules';
import { isLogicGridSolved } from '@/types/puzzle-modules';

// ============================================================================
// LogicGrid – Einstein-style logic puzzle
// ============================================================================

export interface LogicGridProps {
  config: LogicGridConfig;
  state: LogicGridState;
  onCellChange: (cell: LogicGridCell) => void;
  onRevealClue?: (clueId: string) => void;
  onSolved?: () => void;
  className?: string;
}

export function LogicGrid({
  config,
  state,
  onCellChange,
  onRevealClue,
  onSolved: _onSolved,
  className = '',
}: LogicGridProps) {
  const [selectedSection, setSelectedSection] = useState<{
    rowCat: string;
    colCat: string;
  } | null>(null);

  // Generate grid sections (each pair of categories)
  const gridSections = useMemo(() => {
    const sections: { rowCat: LogicGridCategory; colCat: LogicGridCategory }[] = [];
    for (let i = 0; i < config.categories.length - 1; i++) {
      for (let j = i + 1; j < config.categories.length; j++) {
        sections.push({
          rowCat: config.categories[i],
          colCat: config.categories[j],
        });
      }
    }
    return sections;
  }, [config.categories]);

  // Get cell value
  const getCellValue = useCallback(
    (rowCatId: string, rowIdx: number, colCatId: string, colIdx: number): LogicGridCellValue => {
      const cell = state.cells.find(
        c =>
          c.rowCategoryId === rowCatId &&
          c.rowItemIndex === rowIdx &&
          c.colCategoryId === colCatId &&
          c.colItemIndex === colIdx
      );
      return cell?.value ?? 'unknown';
    },
    [state.cells]
  );

  // Handle cell click - cycle through values
  const handleCellClick = (
    rowCatId: string,
    rowIdx: number,
    colCatId: string,
    colIdx: number
  ) => {
    const currentValue = getCellValue(rowCatId, rowIdx, colCatId, colIdx);
    const nextValue: LogicGridCellValue =
      currentValue === 'unknown' ? 'yes' : currentValue === 'yes' ? 'no' : 'unknown';

    onCellChange({
      rowCategoryId: rowCatId,
      rowItemIndex: rowIdx,
      colCategoryId: colCatId,
      colItemIndex: colIdx,
      value: nextValue,
    });
  };

  // Visible clues
  const visibleClues = config.progressiveClues
    ? config.clues.filter(c => c.revealed || state.revealedClueIds.includes(c.id))
    : config.clues;

  const hiddenClueCount = config.clues.length - visibleClues.length;

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Title */}
      <div>
        <h3 className="text-xl font-bold">{config.title}</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Klicka på celler för att markera: ✓ (ja), ✗ (nej), eller ? (okänt)
        </p>
      </div>

      {/* Clues */}
      <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 mb-3">
          <LightBulbIcon className="h-5 w-5 text-amber-500" />
          <h4 className="font-semibold">Ledtrådar</h4>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          {visibleClues.map((clue) => (
            <li key={clue.id} className="text-zinc-700 dark:text-zinc-300">
              {clue.text}
            </li>
          ))}
        </ol>
        {config.progressiveClues && hiddenClueCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              const nextClue = config.clues.find(
                c => !c.revealed && !state.revealedClueIds.includes(c.id)
              );
              if (nextClue) onRevealClue?.(nextClue.id);
            }}
          >
            Visa nästa ledtråd ({hiddenClueCount} kvar)
          </Button>
        )}
      </div>

      {/* Grid sections */}
      <div className="flex flex-wrap gap-4">
        {gridSections.map(({ rowCat, colCat }) => (
          <GridSection
            key={`${rowCat.id}-${colCat.id}`}
            rowCategory={rowCat}
            colCategory={colCat}
            getCellValue={getCellValue}
            onCellClick={handleCellClick}
            isExpanded={
              selectedSection?.rowCat === rowCat.id &&
              selectedSection?.colCat === colCat.id
            }
            onToggleExpand={() =>
              setSelectedSection(
                selectedSection?.rowCat === rowCat.id &&
                  selectedSection?.colCat === colCat.id
                  ? null
                  : { rowCat: rowCat.id, colCat: colCat.id }
              )
            }
          />
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">Drag: {state.moveCount}</span>
        {state.isSolved && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-medium">Löst!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// GridSection – One category pair grid
// ============================================================================

interface GridSectionProps {
  rowCategory: LogicGridCategory;
  colCategory: LogicGridCategory;
  getCellValue: (
    rowCatId: string,
    rowIdx: number,
    colCatId: string,
    colIdx: number
  ) => LogicGridCellValue;
  onCellClick: (
    rowCatId: string,
    rowIdx: number,
    colCatId: string,
    colIdx: number
  ) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function GridSection({
  rowCategory,
  colCategory,
  getCellValue,
  onCellClick,
  isExpanded,
  onToggleExpand,
}: GridSectionProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isExpanded ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-left text-sm font-medium flex items-center justify-between"
      >
        <span>
          {rowCategory.name} × {colCategory.name}
        </span>
      </button>

      {/* Grid */}
      <div className="overflow-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="w-20 h-8" />
              {colCategory.items.map((item, idx) => (
                <th
                  key={idx}
                  className="w-8 h-8 text-xs font-normal text-zinc-500 border-l border-zinc-200 dark:border-zinc-700"
                  title={item}
                >
                  {item.slice(0, 2)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowCategory.items.map((rowItem, rowIdx) => (
              <tr key={rowIdx}>
                <td
                  className="px-2 py-1 text-xs text-right border-t border-zinc-200 dark:border-zinc-700"
                  title={rowItem}
                >
                  {rowItem.slice(0, 8)}
                </td>
                {colCategory.items.map((_, colIdx) => {
                  const value = getCellValue(
                    rowCategory.id,
                    rowIdx,
                    colCategory.id,
                    colIdx
                  );
                  return (
                    <td
                      key={colIdx}
                      className="w-8 h-8 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      onClick={() =>
                        onCellClick(rowCategory.id, rowIdx, colCategory.id, colIdx)
                      }
                    >
                      <CellIcon value={value} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// CellIcon – Cell value display
// ============================================================================

function CellIcon({ value }: { value: LogicGridCellValue }) {
  switch (value) {
    case 'yes':
      return (
        <div className="w-full h-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
          <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      );
    case 'no':
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
          <XMarkIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
      );
    default:
      return <div className="w-full h-full" />;
  }
}

// ============================================================================
// useLogicGrid – Hook for managing logic grid state
// ============================================================================

export function useLogicGrid(config: LogicGridConfig) {
  const [state, setState] = useState<LogicGridState>({
    cells: [],
    revealedClueIds: [],
    isSolved: false,
    moveCount: 0,
    startedAt: new Date().toISOString(),
  });

  const handleCellChange = useCallback(
    (cell: LogicGridCell) => {
      setState(prev => {
        // Remove existing cell if any
        const newCells = prev.cells.filter(
          c =>
            !(
              c.rowCategoryId === cell.rowCategoryId &&
              c.rowItemIndex === cell.rowItemIndex &&
              c.colCategoryId === cell.colCategoryId &&
              c.colItemIndex === cell.colItemIndex
            )
        );

        // Add new cell if not unknown
        if (cell.value !== 'unknown') {
          newCells.push(cell);
        }

        const isSolved = isLogicGridSolved(newCells, config.solution);

        return {
          ...prev,
          cells: newCells,
          moveCount: prev.moveCount + 1,
          isSolved,
          solvedAt: isSolved ? new Date().toISOString() : undefined,
        };
      });
    },
    [config.solution]
  );

  const revealClue = useCallback((clueId: string) => {
    setState(prev => ({
      ...prev,
      revealedClueIds: [...prev.revealedClueIds, clueId],
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      cells: [],
      revealedClueIds: [],
      isSolved: false,
      moveCount: 0,
      startedAt: new Date().toISOString(),
    });
  }, []);

  return { state, handleCellChange, revealClue, reset };
}
