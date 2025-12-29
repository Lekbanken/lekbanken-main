import assert from 'node:assert/strict';

import { parseGamesFromJsonPayload } from '../features/admin/games/utils/json-game-import';
import { actionIdsToOrderAliases, conditionIdsToOrderAliases } from '../lib/games/trigger-order-alias';

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeForCompare(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForCompare);
  if (!isJsonRecord(value)) return value;

  // Drop undefined values for stable deep-equality
  const out: JsonRecord = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    out[k] = normalizeForCompare(v);
  }

  // Sort arrays where order should be deterministic
  if (Array.isArray(out.artifacts)) {
    out.artifacts = [...out.artifacts].sort((a, b) => {
      const ao = isJsonRecord(a) ? a.artifact_order : undefined;
      const bo = isJsonRecord(b) ? b.artifact_order : undefined;
      return (typeof ao === 'number' ? ao : 0) - (typeof bo === 'number' ? bo : 0);
    });
  }

  if (Array.isArray(out.triggers)) {
    out.triggers = [...out.triggers].sort((a, b) => {
      const ao = isJsonRecord(a) ? a.sort_order : undefined;
      const bo = isJsonRecord(b) ? b.sort_order : undefined;
      return (typeof ao === 'number' ? ao : 0) - (typeof bo === 'number' ? bo : 0);
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Construct a representative Legendary game export payload
// ---------------------------------------------------------------------------

const stepOrderById = new Map<string, number>([
  ['step_1_id', 0],
  ['step_2_id', 1],
]);

const phaseOrderById = new Map<string, number>([
  ['phase_1_id', 0],
]);

const artifactOrderById = new Map<string, number>([
  ['artifact_keypad_id', 5],
  ['artifact_note_id', 2],
]);

const triggerConditionWithIds = { type: 'keypad_correct', keypadId: 'artifact_keypad_id' };
const triggerActionWithIds = { type: 'reveal_artifact', artifactId: 'artifact_note_id' };

const triggerConditionOrderBased = conditionIdsToOrderAliases(triggerConditionWithIds, {
  stepOrderById,
  phaseOrderById,
  artifactOrderById,
});

const triggerActionsOrderBased = [
  actionIdsToOrderAliases(triggerActionWithIds, { artifactOrderById }),
];

const legendaryGame = {
  game_key: 'legendary-roundtrip',
  name: 'Legendary Roundtrip',
  short_description: 'Testar export→import→export',
  description: null,
  play_mode: 'participants',
  status: 'draft',
  locale: null,
  energy_level: 'medium',
  location_type: 'indoor',
  time_estimate_min: 0,
  duration_max: null,
  min_players: 2,
  max_players: 12,
  players_recommended: null,
  age_min: null,
  age_max: null,
  difficulty: 'easy',
  accessibility_notes: null,
  space_requirements: null,
  leader_tips: null,
  main_purpose_id: null,
  sub_purpose_ids: ['purpose_1'],
  product_id: null,
  owner_tenant_id: null,

  steps: [
    {
      step_order: 0,
      title: 'Steg 1',
      body: 'Body 1',
      duration_seconds: 60,
      leader_script: null,
      participant_prompt: null,
      board_text: null,
      optional: false,
    },
    {
      step_order: 1,
      title: 'Steg 2',
      body: 'Body 2',
      duration_seconds: 0,
      leader_script: 'script',
      participant_prompt: 'prompt',
      board_text: 'board',
      optional: true,
    },
  ],

  materials: {
    items: [{ name: 'Penna', quantity: '1', optional: false }],
    safety_notes: 'None',
    preparation: null,
  },

  phases: [
    {
      phase_order: 0,
      name: 'Intro',
      phase_type: 'intro',
      duration_seconds: 30,
      timer_visible: true,
      timer_style: 'countdown',
      description: null,
      board_message: null,
      auto_advance: false,
    },
  ],

  roles: [
    {
      role_order: 0,
      name: 'Detektiv',
      icon: '🕵️',
      color: 'blue',
      public_description: 'Publik',
      private_instructions: 'Privat',
      private_hints: null,
      min_count: 1,
      max_count: 1,
      assignment_strategy: 'random',
      scaling_rules: null,
      conflicts_with: [],
    },
  ],

  boardConfig: {
    show_game_name: true,
    show_current_phase: true,
    show_timer: true,
    show_participants: true,
    show_public_roles: true,
    show_leaderboard: false,
    show_qr_code: true,
    welcome_message: null,
    theme: 'mystery',
    background_color: null,
    layout_variant: 'standard',
  },

  artifacts: [
    {
      artifact_order: 2,
      locale: null,
      title: 'Note',
      description: null,
      artifact_type: 'note',
      tags: ['tag1'],
      metadata: {},
      variants: [
        {
          variant_order: 0,
          visibility: 'public',
          visible_to_role_id: null,
          title: 'Note title',
          body: 'Note body',
          media_ref: null,
          metadata: {},
        },
      ],
    },
    {
      artifact_order: 5,
      locale: null,
      title: 'Keypad',
      description: null,
      artifact_type: 'keypad',
      tags: [],
      metadata: { correctCode: '1234' },
      variants: [],
    },
  ],

  triggers: [
    {
      name: 'Keypad → Reveal',
      description: null,
      enabled: true,
      condition: triggerConditionOrderBased,
      actions: triggerActionsOrderBased,
      execute_once: true,
      delay_seconds: 0,
      sort_order: 0,
    },
  ],
};

// ---------------------------------------------------------------------------
// export → import → export
// ---------------------------------------------------------------------------

const exportJson = (games: unknown) => JSON.stringify(games, null, 2);

const exported1 = exportJson([legendaryGame]);
const imported = parseGamesFromJsonPayload(exported1);
const exported2 = exportJson(imported);

const o1 = normalizeForCompare(JSON.parse(exported1));
const o2 = normalizeForCompare(JSON.parse(exported2));

assert.deepEqual(o2, o1);

console.log('OK: Legendary JSON export→import→export is semantically stable (DB-free).');
