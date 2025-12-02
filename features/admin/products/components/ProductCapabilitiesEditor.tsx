'use client';

import { ChangeEvent } from "react";
import { Button } from "@/components/ui";
import { Capability } from "../types";

type ProductCapabilitiesEditorProps = {
  capabilities: Capability[];
  value: string[];
  onChange: (keys: string[]) => void;
};

// Group icons mapping
const groupIcons: Record<string, string> = {
  Browse: "🔍",
  Play: "🎮",
  Planner: "📋",
  Gamification: "🏆",
  Analytics: "📊",
  Admin: "⚙️",
  General: "📦",
};

export function ProductCapabilitiesEditor({ capabilities, value, onChange }: ProductCapabilitiesEditorProps) {
  const groups = groupByGroup(capabilities);

  const handleToggleGroup = (keys: string[]) => {
    const allSelected = keys.every((key) => value.includes(key));
    if (allSelected) {
      onChange(value.filter((k) => !keys.includes(k)));
    } else {
      onChange(Array.from(new Set([...value, ...keys])));
    }
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, items]) => {
        const groupKeys = items.map((item) => item.key);
        const selectedInGroup = groupKeys.filter((key) => value.includes(key)).length;
        const allSelected = selectedInGroup === groupKeys.length;
        
        return (
          <div key={group} className="rounded-xl border border-border overflow-hidden">
            {/* Group header */}
            <div className="flex items-center justify-between bg-muted/50 px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-base">{groupIcons[group] || "📦"}</span>
                <span className="font-medium text-foreground">{group}</span>
                <span className="text-xs text-muted-foreground">
                  ({selectedInGroup}/{items.length})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleToggleGroup(groupKeys)}
                className="text-xs"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
            </div>
            
            {/* Capabilities list */}
            <div className="divide-y divide-border">
              {items.map((capability) => (
                <label
                  key={capability.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(capability.key)}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      if (event.target.checked) {
                        onChange([...value, capability.key]);
                      } else {
                        onChange(value.filter((k) => k !== capability.key));
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{capability.label}</p>
                    {capability.description && (
                      <p className="text-xs text-muted-foreground">{capability.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function groupByGroup(capabilities: Capability[]): Record<string, Capability[]> {
  return capabilities.reduce<Record<string, Capability[]>>((acc, cap) => {
    const group = cap.group || "General";
    acc[group] = acc[group] || [];
    acc[group].push(cap);
    return acc;
  }, {});
}
