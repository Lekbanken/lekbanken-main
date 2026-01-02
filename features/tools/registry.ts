import type { ToolDefinition, ToolKey } from './types';

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  {
    key: 'dice_roller_v1',
    name: 'Dice Roller',
    description: 'Roll a die and reveal the result after a short animation.',
    defaultScope: 'both',
  },
] as const;

export function getToolDefinition(key: ToolKey): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.key === key);
}
