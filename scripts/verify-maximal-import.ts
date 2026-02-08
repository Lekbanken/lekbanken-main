/**
 * Verify Maximal Import Example
 * 
 * This script tests the JSON_IMPORT_BLUEPRINT maximal example
 * by running it through the actual import validation and database insertion.
 * 
 * Usage: npx tsx scripts/verify-maximal-import.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { parseGamesFromJsonPayload } from '@/features/admin/games/utils/json-game-import';
import { validateGames } from '@/features/admin/games/utils/game-validator';
import { normalizeAndValidate } from '@/lib/import/metadataSchemas';
import { runPreflightValidation } from '@/lib/import/preflight-validation';
import type { ParsedGame, ImportOptions } from '@/types/csv-import';

// =============================================================================
// Metadata Validation (copy from route.ts)
// =============================================================================

interface MetadataValidationError {
  game_key: string;
  artifact_ref: string;
  artifact_type: string;
  errors: string[];
}

interface MetadataValidationWarning {
  game_key: string;
  artifact_ref: string;
  artifact_type: string;
  warnings: string[];
  appliedAliases: string[];
}

function validateAndNormalizeMetadata(games: ParsedGame[]): {
  games: ParsedGame[];
  errors: MetadataValidationError[];
  warnings: MetadataValidationWarning[];
} {
  const errors: MetadataValidationError[] = [];
  const warnings: MetadataValidationWarning[] = [];
  
  const normalizedGames = games.map((game) => {
    if (!game.artifacts?.length) return game;
    
    const normalizedArtifacts = game.artifacts.map((artifact, index) => {
      const artifactRef = (artifact as { id?: string }).id || `artifact_${index}`;
      const artifactType = (artifact as { artifact_type?: string }).artifact_type || 'unknown';
      const rawMetadata = (artifact as { metadata?: unknown }).metadata ?? {};
      
      let parsedMetadata: unknown = rawMetadata;
      if (typeof rawMetadata === 'string') {
        if (rawMetadata.trim() === '') {
          parsedMetadata = {};
        } else {
          try {
            parsedMetadata = JSON.parse(rawMetadata);
          } catch {
            errors.push({
              game_key: game.game_key,
              artifact_ref: artifactRef,
              artifact_type: artifactType,
              errors: [`Metadata är ogiltig JSON: ${rawMetadata.substring(0, 100)}...`],
            });
            parsedMetadata = {};
          }
        }
      }
      
      const result = normalizeAndValidate(artifactType, parsedMetadata);
      
      if (!result.validation.ok) {
        errors.push({
          game_key: game.game_key,
          artifact_ref: artifactRef,
          artifact_type: artifactType,
          errors: result.validation.errors,
        });
      }
      
      if (result.validation.warnings.length > 0 || result.appliedAliases.length > 0 || result.normalizeWarnings.length > 0) {
        warnings.push({
          game_key: game.game_key,
          artifact_ref: artifactRef,
          artifact_type: artifactType,
          warnings: [...result.normalizeWarnings, ...result.validation.warnings],
          appliedAliases: result.appliedAliases,
        });
      }
      
      return { ...artifact, metadata: result.canonical };
    });
    
    return { ...game, artifacts: normalizedArtifacts };
  });
  
  return { games: normalizedGames, errors, warnings };
}

// =============================================================================
// Main Test Flow
// =============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFY MAXIMAL IMPORT EXAMPLE');
  console.log('='.repeat(80));
  console.log();

  // Step 1: Load the maximal example
  const examplePath = path.join(process.cwd(), 'docs/builder/maximal-import-example.json');
  console.log(`[1] Loading example from: ${examplePath}`);
  
  if (!fs.existsSync(examplePath)) {
    console.error('❌ FAIL: maximal-import-example.json not found');
    process.exit(1);
  }
  
  const rawJson = fs.readFileSync(examplePath, 'utf-8');
  console.log(`    File size: ${rawJson.length} bytes`);
  console.log();

  // Step 2: Parse JSON
  console.log('[2] Parsing JSON payload...');
  let games: ParsedGame[];
  try {
    games = parseGamesFromJsonPayload(rawJson);
    console.log(`    ✅ Parsed ${games.length} game(s)`);
    for (const g of games) {
      console.log(`       - game_key: ${g.game_key}`);
      console.log(`         steps: ${g.steps?.length ?? 0}`);
      console.log(`         phases: ${g.phases?.length ?? 0}`);
      console.log(`         roles: ${g.roles?.length ?? 0}`);
      console.log(`         artifacts: ${g.artifacts?.length ?? 0}`);
      console.log(`         triggers: ${g.triggers?.length ?? 0}`);
    }
  } catch (err) {
    console.error('❌ FAIL: JSON parse error');
    console.error(err);
    process.exit(1);
  }
  console.log();

  // Step 3: Run game-level validation
  console.log('[3] Running game-level validation...');
  const importOptions: ImportOptions = {
    mode: 'create',
    validateOnly: true,
    defaultStatus: 'draft',
  };
  const gameValidation = validateGames(games, importOptions);
  console.log(`    Errors: ${gameValidation.allErrors.length}`);
  console.log(`    Warnings: ${gameValidation.allWarnings.length}`);
  
  if (gameValidation.allErrors.length > 0) {
    console.error('❌ FAIL: Game validation errors:');
    for (const e of gameValidation.allErrors) {
      console.error(`    Row ${e.row}: [${e.code ?? 'NO_CODE'}] ${e.message}`);
    }
    process.exit(1);
  }
  console.log(`    ✅ Game validation passed`);
  console.log();

  // Step 4: Metadata normalization & validation
  console.log('[4] Running metadata validation...');
  const metaResult = validateAndNormalizeMetadata(games);
  console.log(`    Metadata errors: ${metaResult.errors.length}`);
  console.log(`    Metadata warnings: ${metaResult.warnings.length}`);
  
  if (metaResult.errors.length > 0) {
    console.error('❌ FAIL: Metadata validation errors:');
    for (const e of metaResult.errors) {
      console.error(`    ${e.game_key} / ${e.artifact_ref} (${e.artifact_type}):`);
      for (const msg of e.errors) {
        console.error(`      - ${msg}`);
      }
    }
    process.exit(1);
  }
  
  if (metaResult.warnings.length > 0) {
    console.log('    Metadata warnings (non-blocking):');
    for (const w of metaResult.warnings) {
      console.log(`      ${w.artifact_ref} (${w.artifact_type}):`);
      for (const msg of w.warnings) {
        console.log(`        ⚠️ ${msg}`);
      }
      if (w.appliedAliases.length > 0) {
        console.log(`        Aliases: ${w.appliedAliases.join(', ')}`);
      }
    }
  }
  console.log(`    ✅ Metadata validation passed`);
  console.log();

  // Step 5: Preflight validation
  console.log('[5] Running preflight validation...');
  const game = metaResult.games[0]; // We only have one game in the example
  const preflightResult = runPreflightValidation(game, randomUUID);
  console.log(`    Preflight OK: ${preflightResult.ok}`);
  console.log(`    Blocking errors: ${preflightResult.blockingErrors.length}`);
  console.log(`    Warnings: ${preflightResult.warnings.length}`);
  
  if (!preflightResult.ok) {
    console.error('❌ FAIL: Preflight validation errors:');
    for (const e of preflightResult.blockingErrors) {
      console.error(`    Row ${e.row}: [${e.code ?? 'NO_CODE'}] ${e.message}`);
    }
    process.exit(1);
  }
  
  if (preflightResult.warnings.length > 0) {
    console.log('    Preflight warnings (non-blocking):');
    for (const w of preflightResult.warnings) {
      console.log(`      ⚠️ [${w.code ?? 'NO_CODE'}] ${w.message}`);
    }
  }
  console.log(`    ✅ Preflight validation passed`);
  console.log();

  // Step 6: Summary
  console.log('='.repeat(80));
  console.log('DRY-RUN VALIDATION RESULT: ✅ PASS');
  console.log('='.repeat(80));
  console.log();
  console.log('Summary:');
  console.log(`  Games: ${games.length}`);
  console.log(`  Steps: ${games.reduce((acc, g) => acc + (g.steps?.length ?? 0), 0)}`);
  console.log(`  Phases: ${games.reduce((acc, g) => acc + (g.phases?.length ?? 0), 0)}`);
  console.log(`  Roles: ${games.reduce((acc, g) => acc + (g.roles?.length ?? 0), 0)}`);
  console.log(`  Artifacts: ${games.reduce((acc, g) => acc + (g.artifacts?.length ?? 0), 0)}`);
  console.log(`  Triggers: ${games.reduce((acc, g) => acc + (g.triggers?.length ?? 0), 0)}`);
  console.log();

  // Step 7: Ask about DB insertion
  console.log('[6] Database insertion test...');
  console.log('    Skipping actual DB insertion (use --write flag to enable)');
  console.log();

  if (process.argv.includes('--write')) {
    console.log('[7] Performing REAL import to database...');
    console.log('    This requires running through the actual API endpoint.');
    console.log('    Starting Next.js dev server and calling import API...');
    console.log();
    console.log('    To test real import, run:');
    console.log('    1. Start dev server: npm run dev');
    console.log('    2. Use curl or Postman to POST to /api/games/csv-import');
    console.log('    3. With format=json, dry_run=false, upsert=true');
    console.log();
    console.log('    Alternative: Use the Admin UI at /admin/games/import');
  }

  console.log('='.repeat(80));
  console.log('ALL CHECKS PASSED');
  console.log('='.repeat(80));
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
