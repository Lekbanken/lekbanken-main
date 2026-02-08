/**
 * Pre-flight Order Contract Tests
 * 
 * PURPOSE: Tripwire test to ensure trigger rewrite happens BEFORE any DB writes.
 * This prevents regression to partial import risk.
 * 
 * GUARANTEE: "No DB writes occur for a game if trigger rewrite fails."
 * 
 * These tests verify the code structure, not runtime behavior.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Pre-flight Order Contract', () => {
  // Read the route file once for all tests
  const routePath = path.join(process.cwd(), 'app/api/games/csv-import/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');

  describe('importRelatedData structure', () => {
    it('should have PHASE 1 (UUID generation) before PHASE 2 (trigger rewrite)', () => {
      const phase1Index = routeContent.indexOf('PHASE 1: Pre-generate UUIDs');
      const phase2Index = routeContent.indexOf('PHASE 2: Pre-flight trigger validation');
      
      expect(phase1Index).toBeGreaterThan(-1);
      expect(phase2Index).toBeGreaterThan(-1);
      expect(phase1Index).toBeLessThan(phase2Index);
    });

    it('should have PHASE 2 (trigger rewrite) before PHASE 3 (DB writes)', () => {
      const phase2Index = routeContent.indexOf('PHASE 2: Pre-flight trigger validation');
      const phase3Index = routeContent.indexOf('PHASE 3: Atomic DB Write via RPC');
      
      expect(phase2Index).toBeGreaterThan(-1);
      expect(phase3Index).toBeGreaterThan(-1);
      expect(phase2Index).toBeLessThan(phase3Index);
    });

    it('should call rewriteAllTriggerRefs before atomic RPC call', () => {
      // Find the first RPC call AFTER importRelatedData function starts
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const afterFunctionStart = routeContent.slice(functionStart);
      
      // The RPC call should be AFTER rewriteAllTriggerRefs in the function
      const rewriteInFunction = afterFunctionStart.indexOf('rewriteAllTriggerRefs(');
      const rpcCallInFunction = afterFunctionStart.indexOf(".rpc('upsert_game_content_v1'");
      
      expect(rewriteInFunction).toBeGreaterThan(-1);
      expect(rpcCallInFunction).toBeGreaterThan(-1);
      expect(rewriteInFunction).toBeLessThan(rpcCallInFunction);
    });

    it('should throw on trigger errors BEFORE any DB operations', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const afterFunctionStart = routeContent.slice(functionStart);
      
      // Find the throw for trigger errors (uses PreflightValidationError)
      const triggerThrowIndex = afterFunctionStart.indexOf('throw new PreflightValidationError(triggerErrors)');
      
      // Find the atomic RPC call (the ONLY DB write operation)
      const rpcCallIndex = afterFunctionStart.indexOf(".rpc('upsert_game_content_v1'");
      
      expect(triggerThrowIndex).toBeGreaterThan(-1);
      expect(rpcCallIndex).toBeGreaterThan(-1);
      
      // Throw must come BEFORE the RPC call
      expect(triggerThrowIndex).toBeLessThan(rpcCallIndex);
    });

    it('should throw on order collision BEFORE any DB operations', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const afterFunctionStart = routeContent.slice(functionStart);
      
      // Find the throw for order collision errors
      const collisionThrowIndex = afterFunctionStart.indexOf('throw new PreflightValidationError(preflightErrors)');
      
      // Find the atomic RPC call (the ONLY DB write operation)
      const rpcCallIndex = afterFunctionStart.indexOf(".rpc('upsert_game_content_v1'");
      
      expect(collisionThrowIndex).toBeGreaterThan(-1);
      expect(rpcCallIndex).toBeGreaterThan(-1);
      
      // Throw must come BEFORE the RPC call
      expect(collisionThrowIndex).toBeLessThan(rpcCallIndex);
    });

    it('should have log markers in correct order', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const afterFunctionStart = routeContent.slice(functionStart);
      
      const preflightOkLog = afterFunctionStart.indexOf('preflight.trigger_rewrite.ok');
      const dbWriteBeginLog = afterFunctionStart.indexOf('db.write.begin');
      const dbWriteDoneLog = afterFunctionStart.indexOf('db.write.done');
      
      expect(preflightOkLog).toBeGreaterThan(-1);
      expect(dbWriteBeginLog).toBeGreaterThan(-1);
      expect(dbWriteDoneLog).toBeGreaterThan(-1);
      
      expect(preflightOkLog).toBeLessThan(dbWriteBeginLog);
      expect(dbWriteBeginLog).toBeLessThan(dbWriteDoneLog);
    });

    it('should document the guarantee in function comment', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      // Look for the comment block before the function
      const commentBlockStart = routeContent.lastIndexOf('/**', functionStart);
      const commentBlock = routeContent.slice(commentBlockStart, functionStart);
      
      expect(commentBlock).toContain('No DB writes occur for a game if trigger rewrite fails');
    });
  });

  describe('ID pre-generation', () => {
    it('should pre-generate step IDs with randomUUID', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      // Should generate step IDs
      expect(phase1Content).toContain('stepIdByOrder');
      expect(phase1Content).toContain('randomUUID()');
    });

    it('should pre-generate phase IDs with randomUUID', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      expect(phase1Content).toContain('phaseIdByOrder');
      expect(phase1Content).toContain('randomUUID()');
    });

    it('should pre-generate artifact IDs with randomUUID', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      expect(phase1Content).toContain('artifactIdByOrder');
      expect(phase1Content).toContain('randomUUID()');
    });

    it('should build TriggerIdMap from pre-generated UUIDs, not from DB', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase3Start = routeContent.indexOf('PHASE 3:', functionStart);
      const phase2Content = routeContent.slice(phase2Start, phase3Start);
      
      // Should build idMap from local Maps
      expect(phase2Content).toContain('stepIdByOrder');
      expect(phase2Content).toContain('phaseIdByOrder');
      expect(phase2Content).toContain('artifactIdByOrder');
      
      // Should NOT query DB for IDs in phase 2
      expect(phase2Content).not.toContain('.select(');
      expect(phase2Content).not.toContain('db.from(');
    });
  });

  describe('Order collision detection', () => {
    it('should have collision check for step_order', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      expect(phase1Content).toContain('Duplicate step_order');
      expect(phase1Content).toContain('stepIdByOrder.has(stepOrder)');
    });

    it('should have collision check for phase_order', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      expect(phase1Content).toContain('Duplicate phase_order');
      expect(phase1Content).toContain('phaseIdByOrder.has(phaseOrder)');
    });

    it('should have collision check for artifact_order', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      expect(phase1Content).toContain('Duplicate artifact_order');
      expect(phase1Content).toContain('artifactIdByOrder.has(artifactOrder)');
    });

    it('should have collision check for role_order', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      // Should detect duplicate role_order
      expect(phase1Content).toContain('Duplicate role_order');
      expect(phase1Content).toContain('roleIdByOrder.has(roleOrder)');
    });

    it('should pre-generate role IDs with randomUUID', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      // Should generate role IDs (required for visible_to_role_id in variants)
      expect(phase1Content).toContain('roleIdByOrder');
      expect(phase1Content).toContain('roleIdByName');
    });

    it('should pre-resolve visible_to_role_id before RPC', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const phase1Start = routeContent.indexOf('PHASE 1:', functionStart);
      const phase2Start = routeContent.indexOf('PHASE 2:', functionStart);
      const phase1Content = routeContent.slice(phase1Start, phase2Start);
      
      // Should resolve visible_to_role_id from aliases (order or name)
      expect(phase1Content).toContain('visible_to_role_order');
      expect(phase1Content).toContain('visible_to_role_name');
      expect(phase1Content).toContain('variantRows');
    });
  });

  describe('Atomic write boundary (RPC)', () => {
    it('should NOT have any direct .insert() calls in importRelatedData', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const functionEnd = routeContent.indexOf('\n}', routeContent.indexOf('db.write.done', functionStart));
      const functionContent = routeContent.slice(functionStart, functionEnd);
      
      // No direct inserts - all writes go through RPC
      const insertPattern = /\.from\(['"]game_[^'"]+['"]\)\.insert\(/g;
      const matches = functionContent.match(insertPattern);
      expect(matches).toBeNull();
    });

    it('should NOT have any direct .delete() calls in importRelatedData', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const functionEnd = routeContent.indexOf('\n}', routeContent.indexOf('db.write.done', functionStart));
      const functionContent = routeContent.slice(functionStart, functionEnd);
      
      // No direct deletes - all writes go through RPC
      const deletePattern = /\.from\(['"]game_[^'"]+['"]\)\.delete\(/g;
      const matches = functionContent.match(deletePattern);
      expect(matches).toBeNull();
    });

    it('should use exactly one RPC call for all writes', () => {
      const functionStart = routeContent.indexOf('async function importRelatedData');
      const functionEnd = routeContent.indexOf('\n}', routeContent.indexOf('db.write.done', functionStart));
      const functionContent = routeContent.slice(functionStart, functionEnd);
      
      // Exactly one RPC call
      const rpcPattern = /\.rpc\(['"]upsert_game_content_v1['"]/g;
      const matches = functionContent.match(rpcPattern);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(1);
    });

    it('should document atomic guarantee in PHASE 3 comment', () => {
      const phase3Start = routeContent.indexOf('PHASE 3: Atomic DB Write via RPC');
      expect(phase3Start).toBeGreaterThan(-1);
      
      const phase3Comment = routeContent.slice(phase3Start, phase3Start + 300);
      expect(phase3Comment).toContain('Either all changes commit, or nothing changes');
    });
  });

  describe('PreflightValidationError', () => {
    it('should define PreflightValidationError class', () => {
      expect(routeContent).toContain('class PreflightValidationError extends Error');
    });

    it('should have errors property in PreflightValidationError', () => {
      expect(routeContent).toContain('public readonly errors: ImportError[]');
    });

    it('should catch PreflightValidationError in import loop', () => {
      expect(routeContent).toContain('if (err instanceof PreflightValidationError)');
    });

    it('should have preflight.fail log marker', () => {
      expect(routeContent).toContain('preflight.fail');
    });
  });
});
