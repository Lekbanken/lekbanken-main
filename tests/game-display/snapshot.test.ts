/**
 * D3 Task 9.5 — Snapshot Tests
 *
 * Locks the shape of GameDetailData to prevent accidental structural drift.
 * If a field is added/removed/renamed, the snapshot must be explicitly updated.
 *
 * @see GAMEDETAILS_IMPLEMENTATION_PLAN.md D3 Plattformsevolution
 */

import { describe, it, expect } from 'vitest';
import {
  mapDbGameToDetailPreview,
  mapDbGameToDetailFull,
  mapDbGameToSummary,
  type DbGame,
} from '@/lib/game-display';

// =============================================================================
// FIXTURE — Canonical full DbGame with all fields populated
// =============================================================================

const FULL_DB_GAME: DbGame = {
  id: 'snapshot-game-id',
  name: 'Snapshot Lek',
  game_key: 'snapshot-lek',
  slug: 'snapshot-lek',
  description: 'Full beskrivning för snapshot-test.',
  short_description: 'Kort beskrivning',
  instructions: 'Instruktioner här',
  status: 'published',
  play_mode: 'participants',
  energy_level: 'high',
  location_type: 'outdoor',
  difficulty: 'hard',
  category: 'teambuilding',
  time_estimate_min: 20,
  time_estimate_max: 45,
  min_players: 6,
  max_players: 30,
  age_min: 10,
  age_max: 65,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-02-20T14:30:00Z',
  accessibility_notes: 'Kräver rörelseförmåga\nInte lämplig vid regn',
  space_requirements: 'Stor yta (minst 100 kvm)\nPlatt mark',
  leader_tips: 'Var tydlig med regler\nHa extra material redo',
  outcomes: ['Förbättrad koordination', 'Stärkt gruppkänsla'],
  highlights: ['Passar alla åldrar', 'Enkel setup'],
  translations: [
    { locale: 'sv', title: 'Snapshot-leken', short_description: 'Kort sv' },
  ],
  media: [
    { id: 'm1', kind: 'cover', media: { url: 'https://example.com/cover.jpg', alt_text: 'Cover' } },
    { id: 'm2', kind: 'gallery', media: { url: 'https://example.com/g1.jpg', alt_text: 'Gallery' } },
  ],
  product: { name: 'Lekbanken Pro' },
  main_purpose: { id: 'purpose-1', name: 'Teambuilding' },
  steps: [
    {
      id: 'step-1', step_order: 1, title: 'Intro',
      body: 'Beskriv reglerna', duration_seconds: 120,
      display_mode: 'instant', leader_script: 'Samla gruppen',
      participant_prompt: 'Lyssna', board_text: 'START',
      optional: false, phase_id: 'phase-1', media_ref: null, conditional: null,
    },
    {
      id: 'step-2', step_order: 2, title: 'Huvudmoment',
      body: 'Kör igång!', duration_seconds: 600,
      display_mode: 'dramatic', leader_script: null,
      participant_prompt: null, board_text: null,
      optional: true, phase_id: null, media_ref: 'media-ref-1', conditional: 'has_materials',
    },
  ],
  phases: [
    {
      id: 'phase-1', name: 'Uppvärmning', phase_type: 'intro',
      phase_order: 1, duration_seconds: 300, description: 'Värm upp gruppen',
      board_message: 'Fase 1', timer_visible: true, timer_style: 'countdown',
      auto_advance: false,
    },
  ],
  materials: [
    { id: 'mat-1', items: ['Boll', 'Koner'], safety_notes: 'Inga vassa kanter', preparation: 'Ställ ut koner', locale: 'sv' },
  ],
  roles: [
    {
      id: 'role-1', name: 'Anfallare', icon: '⚡', color: '#ff0000',
      role_order: 1, public_description: 'Attackerar',
      private_instructions: 'Spring snabbt', private_hints: 'Flanke',
      min_count: 2, max_count: 5,
      assignment_strategy: 'random',
      scaling_rules: { '10': 3, '20': 5 },
      conflicts_with: ['role-2'],
    },
  ],
  artifacts: [
    {
      id: 'art-1', title: 'Guldmyntet', description: 'Samla mest mynt',
      artifact_type: 'collectible', artifact_order: 1,
      tags: ['guld', 'samla'], metadata: { rarity: 'epic' },
      variants: [
        { id: 'v1', title: 'Standard', body: 'Vanligt mynt', visibility: 'public', visible_to_role_id: null, variant_order: 1, media_ref: null },
      ],
    },
  ],
  triggers: [
    {
      id: 'trig-1', name: 'timer_expired', description: 'Tid slut',
      enabled: true, condition: { type: 'timer', threshold: 0 },
      actions: [{ type: 'end_round' }], execute_once: true,
      delay_seconds: 5, sort_order: 1,
    },
  ],
  board_config: {
    id: 'bc-1', show_timer: true, show_phase_name: true,
    show_step_text: false, show_roles: true, theme: 'dark', layout: null,
  },
  tools: [
    { id: 'tool-1', tool_type: 'timer', name: 'Nedräkning', config: {}, sort_order: 1 },
  ],
};

// =============================================================================
// SNAPSHOT TESTS
// =============================================================================

describe('GameDetailData Snapshot (9.5)', () => {
  it('mapDbGameToSummary shape is stable', () => {
    const summary = mapDbGameToSummary(FULL_DB_GAME);
    expect(Object.keys(summary).sort()).toMatchSnapshot();
    expect(summary).toMatchSnapshot();
  });

  it('mapDbGameToDetailPreview shape is stable', () => {
    const preview = mapDbGameToDetailPreview(FULL_DB_GAME);
    expect(Object.keys(preview).sort()).toMatchSnapshot();
    expect(preview).toMatchSnapshot();
  });

  it('mapDbGameToDetailFull shape is stable', () => {
    const full = mapDbGameToDetailFull(FULL_DB_GAME);
    expect(Object.keys(full).sort()).toMatchSnapshot();
    expect(full).toMatchSnapshot();
  });

  it('GameDetailData fields are superset of GameSummary', () => {
    const summary = mapDbGameToSummary(FULL_DB_GAME);
    const detail = mapDbGameToDetailFull(FULL_DB_GAME);
    const summaryKeys = Object.keys(summary);
    const detailKeys = Object.keys(detail);

    for (const key of summaryKeys) {
      expect(detailKeys).toContain(key);
    }
  });

  it('full is superset of preview', () => {
    const preview = mapDbGameToDetailPreview(FULL_DB_GAME);
    const full = mapDbGameToDetailFull(FULL_DB_GAME);
    const previewKeys = Object.keys(preview);
    const fullKeys = Object.keys(full);

    for (const key of previewKeys) {
      expect(fullKeys).toContain(key);
    }
  });
});
