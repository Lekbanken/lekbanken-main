/**
 * Game Display Roundtrip Test
 *
 * Verifierar att DB → fetch → mapper → GameDetailData fungerar korrekt.
 * 
 * Detta är ett minimalt "smoke test" för data-pipelinen.
 * Kräver testmiljö med en riktig DB-anslutning.
 *
 * @see GAMEDETAILS_SECTION_ANALYSIS.md för full dokumentation
 */

import { describe, it, expect } from 'vitest';
import {
  mapDbGameToDetailPreview,
  mapDbGameToDetailFull,
  mapDbGameToSummary,
  type DbGame,
  type GameDetailData,
  type GameSummary,
} from '@/lib/game-display';

// =============================================================================
// MOCK DATA - Representerar typisk DB-struktur
// =============================================================================

const mockDbGame: DbGame = {
  id: 'test-game-id',
  name: 'Test Lek',
  slug: 'test-lek',
  description: 'En testbeskrivning för leken.',
  status: 'published',
  play_mode: 'facilitated',
  energy_level: 'medium',
  location_type: 'indoor',
  difficulty: 'easy',
  time_estimate_min: 15,
  time_estimate_max: 30,
  min_players: 4,
  max_players: 20,
  age_min: 8,
  age_max: 99,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-30T00:00:00Z',
  // Translations
  translations: [
    {
      locale: 'sv',
      title: 'Testleken',
      short_description: 'Kort beskrivning på svenska',
    },
  ],
  // Media
  media: [
    {
      id: 'media-1',
      kind: 'cover',
      media: { url: 'https://example.com/cover.jpg', alt_text: 'Cover' },
    },
    {
      id: 'media-2',
      kind: 'gallery',
      media: { url: 'https://example.com/gallery1.jpg', alt_text: 'Gallery 1' },
    },
  ],
  // Steps
  steps: [
    {
      id: 'step-1',
      step_order: 1,
      title: 'Steg 1: Intro',
      body: 'Beskrivning av steg 1',
      duration_seconds: 180,
      display_mode: 'instant',
      optional: false,
    },
    {
      id: 'step-2',
      step_order: 2,
      title: 'Steg 2: Huvudmoment',
      body: 'Beskrivning av steg 2',
      duration_seconds: 600,
      display_mode: 'typewriter',
      optional: false,
    },
  ],
  // Materials
  materials: [
    {
      id: 'mat-1',
      items: ['Penna', 'Papper', 'Timer'],
      safety_notes: 'Inga vassa föremål',
      preparation: 'Förbered material innan',
      locale: 'sv',
    },
  ],
  // Phases
  phases: [
    {
      id: 'phase-1',
      name: 'Intro',
      phase_type: 'intro',
      phase_order: 1,
      duration_seconds: 300,
      description: 'Välkomna deltagarna',
      timer_visible: true,
      timer_style: 'countdown',
    },
    {
      id: 'phase-2',
      name: 'Huvudrunda',
      phase_type: 'round',
      phase_order: 2,
      duration_seconds: 900,
      description: 'Huvudaktiviteten',
      timer_visible: true,
      timer_style: 'countdown',
    },
  ],
  // Relations (for full)
  roles: [
    {
      id: 'role-1',
      name: 'Ledare',
      role_order: 1,
      public_description: 'Leder gruppen',
      min_count: 1,
      max_count: 1,
      color: '#FF0000',
    },
  ],
  artifacts: [
    {
      id: 'artifact-1',
      title: 'Hemligt kort',
      description: 'Ett kort med hemlig information',
      artifact_type: 'card',
      artifact_order: 1,
      variants: [
        {
          id: 'variant-1',
          title: 'Variant A',
          body: 'Innehåll A',
          visibility: 'leader_only',
          variant_order: 1,
        },
      ],
    },
  ],
  triggers: [
    {
      id: 'trigger-1',
      name: 'Tidsgräns',
      description: 'Startar när tiden är slut',
      enabled: true,
      condition: { type: 'timer', seconds: 0 },
      actions: [{ type: 'show_message', text: 'Tiden är slut!' }],
      sort_order: 1,
    },
  ],
};

// =============================================================================
// TESTS
// =============================================================================

describe('Game Display Roundtrip', () => {
  describe('mapDbGameToSummary', () => {
    it('should map DB game to GameSummary with correct shape', () => {
      const summary: GameSummary = mapDbGameToSummary(mockDbGame);

      // Required fields
      expect(summary.id).toBe('test-game-id');
      expect(summary.title).toBe('Testleken'); // From translation

      // Optional metadata
      expect(summary.slug).toBe('test-lek');
      expect(summary.shortDescription).toBe('Kort beskrivning på svenska');
      expect(summary.coverUrl).toBe('https://example.com/cover.jpg');
      expect(summary.durationMin).toBe(15);
      expect(summary.durationMax).toBe(30);
      expect(summary.minPlayers).toBe(4);
      expect(summary.maxPlayers).toBe(20);
      expect(summary.energyLevel).toBe('medium');
      expect(summary.environment).toBe('indoor');
      expect(summary.playMode).toBe('facilitated');
      expect(summary.status).toBe('published');
    });
  });

  describe('mapDbGameToDetailPreview', () => {
    it('should map DB game to GameDetailData (preview) with steps, phases, materials', () => {
      const preview: GameDetailData = mapDbGameToDetailPreview(mockDbGame);

      // Summary fields should be present
      expect(preview.id).toBe('test-game-id');
      expect(preview.title).toBe('Testleken');

      // Steps
      expect(preview.steps).toHaveLength(2);
      expect(preview.steps?.[0].title).toBe('Steg 1: Intro');
      expect(preview.steps?.[0].durationMinutes).toBe(3); // 180s / 60
      expect(preview.steps?.[1].displayMode).toBe('typewriter');

      // Phases
      expect(preview.phases).toHaveLength(2);
      expect(preview.phases?.[0].title).toBe('Intro');
      expect(preview.phases?.[0].phaseType).toBe('intro');

      // Materials
      expect(preview.materials).toHaveLength(3);
      expect(preview.materials?.map((m) => m.label)).toEqual(['Penna', 'Papper', 'Timer']);

      // Safety & Preparation
      expect(preview.safety).toEqual(['Inga vassa föremål']);
      expect(preview.preparation).toEqual(['Förbered material innan']);

      // Gallery (excludes cover)
      expect(preview.gallery).toEqual(['https://example.com/gallery1.jpg']);

      // Meta
      expect(preview.meta?.gameKey).toBe('test-lek');

      // Should NOT include roles/artifacts/triggers (lazy-loaded)
      expect(preview.roles).toBeUndefined();
      expect(preview.artifacts).toBeUndefined();
      expect(preview.triggers).toBeUndefined();
    });
  });

  describe('mapDbGameToDetailFull', () => {
    it('should map DB game to GameDetailData (full) including roles, artifacts, triggers', () => {
      const full: GameDetailData = mapDbGameToDetailFull(mockDbGame);

      // All preview fields should be present
      expect(full.id).toBe('test-game-id');
      expect(full.steps).toHaveLength(2);
      expect(full.phases).toHaveLength(2);
      expect(full.materials).toHaveLength(3);

      // Plus full relations
      expect(full.roles).toHaveLength(1);
      expect(full.roles?.[0].name).toBe('Ledare');
      expect(full.roles?.[0].color).toBe('#FF0000');

      expect(full.artifacts).toHaveLength(1);
      expect(full.artifacts?.[0].title).toBe('Hemligt kort');
      expect(full.artifacts?.[0].variants).toHaveLength(1);
      expect(full.artifacts?.[0].variants?.[0].visibility).toBe('leader_only');

      expect(full.triggers).toHaveLength(1);
      expect(full.triggers?.[0].title).toBe('Tidsgräns');
      expect(full.triggers?.[0].enabled).toBe(true);
    });
  });

  describe('Data integrity', () => {
    it('preview should be a subset of full', () => {
      const preview = mapDbGameToDetailPreview(mockDbGame);
      const full = mapDbGameToDetailFull(mockDbGame);

      // All preview fields should exist in full with same values
      expect(full.id).toBe(preview.id);
      expect(full.title).toBe(preview.title);
      expect(full.steps).toEqual(preview.steps);
      expect(full.phases).toEqual(preview.phases);
      expect(full.materials).toEqual(preview.materials);
      expect(full.safety).toEqual(preview.safety);
      expect(full.preparation).toEqual(preview.preparation);
    });

    it('should handle missing optional relations gracefully', () => {
      const minimalGame: DbGame = {
        id: 'minimal-id',
        name: 'Minimal Game',
      };

      const summary = mapDbGameToSummary(minimalGame);
      expect(summary.id).toBe('minimal-id');
      expect(summary.title).toBe('Minimal Game');

      const preview = mapDbGameToDetailPreview(minimalGame);
      expect(preview.steps).toBeUndefined();
      expect(preview.phases).toBeUndefined();
      expect(preview.materials).toBeUndefined();

      const full = mapDbGameToDetailFull(minimalGame);
      expect(full.roles).toBeUndefined();
      expect(full.artifacts).toBeUndefined();
      expect(full.triggers).toBeUndefined();
    });
  });
});
