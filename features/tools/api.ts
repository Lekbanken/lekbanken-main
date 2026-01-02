import { TOOL_REGISTRY } from './registry';
import type { ToolKey, ToolScope } from './types';

export type GameToolRow = {
  tool_key: ToolKey;
  enabled: boolean;
  scope: ToolScope;
};

type SessionGameResponse = {
  title?: string;
  steps?: unknown[];
  phases?: unknown[];
  board?: unknown;
  tools?: Array<{ tool_key: string; enabled?: boolean; scope?: string }>;
};

const VALID_TOOL_KEYS = new Set<string>(TOOL_REGISTRY.map((t) => t.key));

function asToolScope(value: unknown): ToolScope {
  if (value === 'host' || value === 'participants' || value === 'both') return value;
  return 'both';
}

export async function getEnabledToolsForSession(params: {
  sessionId: string;
  participantToken?: string;
}): Promise<GameToolRow[]> {
  const { sessionId, participantToken } = params;

  const res = await fetch(`/api/play/sessions/${sessionId}/game`, {
    headers: participantToken ? { 'x-participant-token': participantToken } : undefined,
    cache: 'no-store',
  });

  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as SessionGameResponse;
  const raw = Array.isArray(data.tools) ? data.tools : [];

  const rows: GameToolRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const tool_key = String(item.tool_key || '').trim();
    if (!tool_key || !VALID_TOOL_KEYS.has(tool_key)) continue;
    const enabled = typeof item.enabled === 'boolean' ? item.enabled : true;
    if (!enabled) continue;

    rows.push({
      tool_key: tool_key as ToolKey,
      enabled: true,
      scope: asToolScope(item.scope),
    });
  }

  return rows;
}
