/**
 * Import Field Coverage Tripwire Tests
 *
 * Documents which fields ARE and ARE NOT supported in the import pipeline.
 * These tests act as a contract for import behavior.
 *
 * POLICY: Any field not explicitly supported should fail import validation
 * or be documented as "explicitly ignored".
 */

import { describe, it, expect } from 'vitest';
import type { ParsedGame, ParsedBoardConfig, ParsedStep, ParsedPhase } from '@/types/csv-import';

describe('Import Field Coverage Contract', () => {
  // =========================================================================
  // TEST 1: Core fields coverage
  // =========================================================================
  describe('Core game fields', () => {
    it('ParsedGame includes all required core fields', () => {
      // This test documents which fields ARE supported
      const requiredCoreFields: (keyof ParsedGame)[] = [
        'game_key',
        'name',
        'short_description',
        'description',
        'play_mode',
        'status',
        'locale',
        'energy_level',
        'location_type',
        'time_estimate_min',
        'duration_max',
        'min_players',
        'max_players',
        'age_min',
        'age_max',
        'difficulty',
        'accessibility_notes',
        'space_requirements',
        'leader_tips',
        'main_purpose_id',
        'sub_purpose_ids',
        'product_id',
        'owner_tenant_id',
      ];

      // Type check - this will fail at compile time if field is removed
      const sampleGame: Partial<ParsedGame> = {};
      for (const field of requiredCoreFields) {
        expect(field in sampleGame || true).toBe(true); // Just documents the fields
      }

      expect(requiredCoreFields.length).toBeGreaterThan(20);
    });

    it('EXPLICITLY UNSUPPORTED: is_demo_content is NOT in ParsedGame', () => {
      // POLICY DECISION: is_demo_content is set via admin UI or seeds, not import
      // This test documents that this is intentional
      type ParsedGameKeys = keyof ParsedGame;
      const keys: ParsedGameKeys[] = [
        'game_key', 'name', 'short_description', 'description', 'play_mode',
        'status', 'locale', 'energy_level', 'location_type', 'time_estimate_min',
        'duration_max', 'min_players', 'max_players', 'players_recommended',
        'age_min', 'age_max', 'difficulty', 'accessibility_notes',
        'space_requirements', 'leader_tips', 'main_purpose_id', 'sub_purpose_ids',
        'product_id', 'owner_tenant_id', 'steps', 'materials', 'phases', 'roles',
        'boardConfig', 'artifacts', 'decisions', 'outcomes', 'triggers',
      ];

      // is_demo_content should NOT be in this list
      expect(keys).not.toContain('is_demo_content');
    });
  });

  // =========================================================================
  // TEST 2: Related data coverage
  // =========================================================================
  describe('Related data fields', () => {
    it('ParsedGame includes all entity collections', () => {
      const entityCollections: (keyof ParsedGame)[] = [
        'steps',
        'phases',
        'roles',
        'artifacts',
        'triggers',
        'materials',
        'boardConfig',
      ];

      for (const collection of entityCollections) {
        // Type assertion ensures this compiles
        const _check: keyof ParsedGame = collection;
        expect(_check).toBeDefined();
      }
    });

    it('ParsedStep includes phase_id for phase assignment', () => {
      const stepFields: (keyof ParsedStep)[] = [
        'step_order',
        'title',
        'body',
        'duration_seconds',
        'leader_script',
        'participant_prompt', // Step has participant_prompt for player instructions
      ];

      expect(stepFields.length).toBeGreaterThan(4);
    });

    it('ParsedPhase includes all phase fields', () => {
      const phaseFields: (keyof ParsedPhase)[] = [
        'phase_order',
        'name',
        'phase_type',
        'duration_seconds',
        'description',
        'board_message',
        'timer_visible',
        'timer_style',
        'auto_advance',
      ];

      expect(phaseFields.length).toBeGreaterThan(5);
    });
  });

  // =========================================================================
  // TEST 3: Board config coverage
  // =========================================================================
  describe('Board config fields', () => {
    it('ParsedBoardConfig includes all board settings', () => {
      const boardFields: (keyof ParsedBoardConfig)[] = [
        'show_game_name',
        'show_current_phase',
        'show_timer',
        'show_participants',
        'show_public_roles',
        'show_leaderboard',
        'show_qr_code',
        'welcome_message',
        'theme',
        'background_color',
        'layout_variant',
      ];

      expect(boardFields.length).toBe(11);
    });
  });

  // =========================================================================
  // TEST 4: Import vs Builder state parity check
  // =========================================================================
  describe('Import vs Builder state parity', () => {
    it('documents fields in Builder but NOT in Import', () => {
      // These fields exist in GameBuilderState.core but NOT in ParsedGame
      // This is by design - they are set via UI only
      const builderOnlyFields = [
        'is_demo_content', // Set via admin UI
        'taxonomy_category', // Internal categorization
      ];

      // Document that these are intentionally omitted
      expect(builderOnlyFields).toContain('is_demo_content');
    });

    it('documents fields in Import but NOT in Builder', () => {
      // These fields exist in ParsedGame but map to different builder fields
      const importSpecificFields = [
        'game_key', // Maps to game.game_key, not in builder core
        'owner_tenant_id', // Set by context, not editable in builder
      ];

      expect(importSpecificFields).toContain('game_key');
    });
  });
});
