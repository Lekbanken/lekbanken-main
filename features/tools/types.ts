export type ToolKey = 'dice_roller_v1' | 'coach_diagram_builder_v1' | 'conversation_cards_v1';

export type ToolScope = 'host' | 'participants' | 'both';

export type ToolRole = 'host' | 'participant';

export type ToolDefinition = {
  key: ToolKey;
  name: string;
  description: string;
  defaultScope: ToolScope;
};

export function isScopeAllowedForRole(scope: ToolScope, role: ToolRole): boolean {
  if (scope === 'both') return true;
  if (scope === 'host') return role === 'host';
  return role === 'participant';
}
