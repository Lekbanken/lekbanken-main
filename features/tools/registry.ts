import type { ToolDefinition, ToolKey } from './types';

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  {
    key: 'dice_roller_v1',
    name: 'Dice Roller',
    description: 'Roll a die and reveal the result after a short animation.',
    defaultScope: 'both',
  },
  {
    key: 'coach_diagram_builder_v1',
    name: 'Coach Diagram Builder',
    description: 'Edit coach diagrams used as step media (SVG-based). Intended for hosts; participants get read-only.',
    defaultScope: 'host',
  },
] as const;

export function getToolDefinition(key: ToolKey): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.key === key);
}
