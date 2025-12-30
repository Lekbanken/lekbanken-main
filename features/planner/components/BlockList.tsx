"use client";

import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { BlockRow } from "./BlockRow";
import { cn } from "@/lib/utils";
import type { PlannerBlock } from "@/types/planner";

interface ExtendedCapabilities {
  canEditBlocks: boolean;
  canDeleteBlocks: boolean;
  canReorderBlocks: boolean;
}

interface BlockListProps {
  blocks: PlannerBlock[];
  capabilities: ExtendedCapabilities;
  onReorder: (activeId: string, overId: string) => void;
  onEditBlock: (block: PlannerBlock) => void;
  onDeleteBlock: (blockId: string) => void;
  onDurationChange: (blockId: string, duration: number) => void;
  isReordering?: boolean;
}

export function BlockList({
  blocks,
  capabilities,
  onReorder,
  onEditBlock,
  onDeleteBlock,
  onDurationChange,
  isReordering = false,
}: BlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  };

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-center">
        <p className="text-sm font-medium text-foreground">Inga block ännu</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Lägg till första blocket för att börja bygga planen.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", isReordering && "pointer-events-none opacity-70")}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-3">
            {blocks.map((block, index) => (
              <BlockRow
                key={block.id}
                block={block}
                index={index + 1}
                canEdit={capabilities.canEditBlocks}
                canDelete={capabilities.canDeleteBlocks}
                canReorder={capabilities.canReorderBlocks}
                onEdit={() => onEditBlock(block)}
                onDelete={() => onDeleteBlock(block.id)}
                onDurationChange={(duration: number) => onDurationChange(block.id, duration)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
