import type { ParsedGame } from '../../../../types/csv-import';

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Parse a JSON payload (exported games array) into ParsedGame[] without applying lossy defaults.
 * This is used by the JSON import API and by roundtrip tests.
 */
export function parseGamesFromJsonPayload(payload: string): ParsedGame[] {
  const data: unknown = JSON.parse(payload);
  if (!Array.isArray(data)) throw new Error('JSON måste vara en array');

  return data.map((raw): ParsedGame => {
    const item: JsonRecord = isJsonRecord(raw) ? raw : {};

    const subPurposeIds = Array.isArray(item.sub_purpose_ids)
      ? (item.sub_purpose_ids as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];

    return {
      game_key: getString(item.game_key) ?? '',
      name: getString(item.name) ?? '',
      short_description: getString(item.short_description) ?? '',
      description: getString(item.description),
      play_mode: (getString(item.play_mode) as ParsedGame['play_mode']) ?? 'basic',
      status: (getString(item.status) as ParsedGame['status']) ?? 'draft',
      locale: getString(item.locale),

      energy_level: (getString(item.energy_level) as ParsedGame['energy_level']) ?? null,
      location_type: (getString(item.location_type) as ParsedGame['location_type']) ?? null,
      time_estimate_min: getNumber(item.time_estimate_min),
      duration_max: getNumber(item.duration_max),
      min_players: getNumber(item.min_players),
      max_players: getNumber(item.max_players),
      players_recommended: getNumber(item.players_recommended),
      age_min: getNumber(item.age_min),
      age_max: getNumber(item.age_max),
      difficulty: getString(item.difficulty),
      accessibility_notes: getString(item.accessibility_notes),
      space_requirements: getString(item.space_requirements),
      leader_tips: getString(item.leader_tips),
      main_purpose_id: getString(item.main_purpose_id),
      sub_purpose_ids: subPurposeIds,
      product_id: getString(item.product_id),
      owner_tenant_id: getString(item.owner_tenant_id),

      // Related data: keep as-is to preserve full fidelity for Legendary JSON.
      steps: (Array.isArray(item.steps) ? (item.steps as ParsedGame['steps']) : []) ?? [],
      materials: (item.materials as ParsedGame['materials']) ?? null,
      phases: (Array.isArray(item.phases) ? (item.phases as ParsedGame['phases']) : []) ?? [],
      roles: (Array.isArray(item.roles) ? (item.roles as ParsedGame['roles']) : []) ?? [],
      boardConfig: (item.boardConfig as ParsedGame['boardConfig']) ?? null,

      artifacts: (Array.isArray(item.artifacts) ? (item.artifacts as ParsedGame['artifacts']) : undefined) ?? undefined,
      decisions: (item.decisions as ParsedGame['decisions']) ?? undefined,
      outcomes: (item.outcomes as ParsedGame['outcomes']) ?? undefined,
      triggers: (Array.isArray(item.triggers) ? (item.triggers as ParsedGame['triggers']) : undefined) ?? undefined,
    };
  });
}
