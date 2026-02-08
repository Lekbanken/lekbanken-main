/**
 * Contract Tests for Import Metadata Schemas
 *
 * Dessa tester låser in beteendet för import-validering enligt
 * BUILDER_METADATA_CONTRACT_CANONICAL.md och IMPORT_METADATA_RISK_REPORT.md.
 *
 * @see docs/builder/BUILDER_METADATA_CONTRACT_CANONICAL.md
 * @see docs/builder/IMPORT_METADATA_RISK_REPORT.md
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeAndValidate,
  normalizeCounter,
  validateCounter,
  normalizeLocationCheck,
  validateLocationCheck,
  normalizeHintContainer,
  validateHintContainer,
  normalizeCipher,
  validateCipher,
} from '../../../lib/import/metadataSchemas';

describe('metadataSchemas contract tests', () => {
  // =========================================================================
  // Test 1: counter utan target ⇒ error (policy)
  // =========================================================================
  describe('counter.target policy', () => {
    it('should return error when target is missing (POLICY: server/client mismatch)', () => {
      const raw = { step: 1, label: 'Test counter' };
      const { canonical, warnings } = normalizeCounter(raw);
      const validation = validateCounter(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/counter\.target.*HARD_REQUIRED.*policy/i)
      );
    });

    it('should pass validation when target is explicitly set', () => {
      const raw = { target: 5, step: 1, label: 'Test counter' };
      const { canonical } = normalizeCounter(raw);
      const validation = validateCounter(canonical);

      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should NOT set target during normalization (validation must catch it)', () => {
      const raw = { step: 1 };
      const { canonical, warnings } = normalizeCounter(raw);

      // target behålls som undefined så validering kan avbryta
      expect(canonical.target).toBeUndefined();
      // Inga warnings vid normalisering - validering hanterar detta
    });
  });

  // =========================================================================
  // Test 2: location_check med checkType='qr' och saknar lat/lon ⇒ ok
  // =========================================================================
  describe('location_check conditional validation', () => {
    it('should pass when checkType=qr and lat/lon are missing', () => {
      const raw = { checkType: 'qr', qrCodeValue: 'SECRET123' };
      const { canonical } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should pass when checkType=manual and lat/lon are missing', () => {
      const raw = { checkType: 'manual', locationName: 'Stationen' };
      const { canonical } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    // =========================================================================
    // Test 3: location_check med checkType='gps' och lat/lon = 0,0 ⇒ error
    // =========================================================================
    it('should return error when checkType=gps and lat/lon are (0,0)', () => {
      const raw = { checkType: 'gps', latitude: 0, longitude: 0 };
      const { canonical } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/\(0,0\).*ogiltigt.*GPS/i)
      );
    });

    it('should return error when checkType=gps and lat/lon are missing', () => {
      const raw = { checkType: 'gps', locationName: 'Parken' };
      const { canonical } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/latitude.*HARD_REQUIRED.*conditional/i)
      );
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/longitude.*HARD_REQUIRED.*conditional/i)
      );
    });

    // =========================================================================
    // Test: location_check utan checkType → error (POLICY: explicit required)
    // =========================================================================
    it('should return error when checkType is missing (POLICY: explicit required)', () => {
      const raw = { latitude: 59.3293, longitude: 18.0686 };
      const { canonical } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/checkType.*HARD_REQUIRED.*policy/i)
      );
    });

    it('should pass when checkType=gps and lat/lon are valid', () => {
      const raw = { checkType: 'gps', latitude: 59.3293, longitude: 18.0686 };
      const { canonical } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should normalize method alias to checkType', () => {
      const raw = { method: 'qr', qrCodeValue: 'ABC' };
      const { canonical, warnings } = normalizeLocationCheck(raw);
      const validation = validateLocationCheck(canonical);

      expect(canonical.checkType).toBe('qr');
      expect(validation.ok).toBe(true);
      expect(warnings).toContainEqual(
        expect.stringMatching(/method.*checkType/i)
      );
    });
  });

  // =========================================================================
  // Test 4: hint_container med hints=[] ⇒ error med QUALITY_GATE message
  // =========================================================================
  describe('hint_container quality gate', () => {
    it('should return error with QUALITY_GATE message when hints is empty array', () => {
      const raw = { hints: [], penaltyPerHint: 10 };
      const { canonical } = normalizeHintContainer(raw);
      const validation = validateHintContainer(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/QUALITY_GATE/i)
      );
    });

    it('should return error when hints is undefined', () => {
      const raw = { penaltyPerHint: 10 };
      const { canonical } = normalizeHintContainer(raw);
      const validation = validateHintContainer(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should pass when hints has at least one element', () => {
      const raw = { hints: [{ text: 'Titta bakom dörren' }] };
      const { canonical } = normalizeHintContainer(raw);
      const validation = validateHintContainer(canonical);

      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should normalize string[] hints to object[] format', () => {
      const raw = { hints: ['Hint 1', 'Hint 2'] };
      const { canonical, warnings } = normalizeHintContainer(raw);

      expect(canonical.hints).toEqual([
        { id: '0', text: 'Hint 1' },
        { id: '1', text: 'Hint 2' },
      ]);
      expect(warnings).toContainEqual(
        expect.stringMatching(/string\[\].*object\[\]/i)
      );
    });
  });

  // =========================================================================
  // Test 5: cipher med alias ⇒ normaliseras till canonical och validerar
  // =========================================================================
  describe('cipher alias normalization', () => {
    it('should normalize cipherText → encodedMessage', () => {
      const raw = {
        cipherText: 'KHOOR',
        plaintext: 'HELLO',
        cipherMethod: 'caesar',
        cipherKey: 3,
      };
      const { canonical, warnings } = normalizeCipher(raw);

      expect(canonical.encodedMessage).toBe('KHOOR');
      expect(warnings).toContainEqual(
        expect.stringMatching(/cipherText.*encodedMessage/i)
      );
    });

    it('should normalize plaintext → expectedPlaintext', () => {
      const raw = {
        encodedMessage: 'KHOOR',
        plaintext: 'HELLO',
      };
      const { canonical, warnings } = normalizeCipher(raw);

      expect(canonical.expectedPlaintext).toBe('HELLO');
      expect(warnings).toContainEqual(
        expect.stringMatching(/plaintext.*expectedPlaintext/i)
      );
    });

    it('should normalize cipherMethod → cipherType', () => {
      const raw = {
        encodedMessage: 'KHOOR',
        expectedPlaintext: 'HELLO',
        cipherMethod: 'atbash',
      };
      const { canonical, warnings } = normalizeCipher(raw);

      expect(canonical.cipherType).toBe('atbash');
      expect(warnings).toContainEqual(
        expect.stringMatching(/cipherMethod.*cipherType/i)
      );
    });

    it('should normalize cipherKey → caesarShift', () => {
      const raw = {
        encodedMessage: 'KHOOR',
        expectedPlaintext: 'HELLO',
        cipherKey: 5,
      };
      const { canonical, warnings } = normalizeCipher(raw);

      expect(canonical.caesarShift).toBe(5);
      expect(warnings).toContainEqual(
        expect.stringMatching(/cipherKey.*caesarShift/i)
      );
    });

    it('should validate successfully after alias normalization', () => {
      const raw = {
        cipherText: 'KHOOR',
        plaintext: 'HELLO',
      };
      const { canonical } = normalizeCipher(raw);
      const validation = validateCipher(canonical);

      expect(validation.ok).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return QUALITY_GATE error when encodedMessage is empty after normalization', () => {
      const raw = {
        cipherText: '',
        plaintext: 'HELLO',
      };
      const { canonical } = normalizeCipher(raw);
      const validation = validateCipher(canonical);

      expect(validation.ok).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.stringMatching(/encodedMessage.*QUALITY_GATE/i)
      );
    });
  });

  // =========================================================================
  // Integration test: normalizeAndValidate dispatcher
  // =========================================================================
  describe('normalizeAndValidate dispatcher', () => {
    it('should route counter type correctly', () => {
      const result = normalizeAndValidate('counter', { target: 10 });

      expect(result.validation.ok).toBe(true);
      expect(result.canonical).toHaveProperty('target', 10);
      expect(result.appliedAliases).toEqual([]);
    });

    it('should route cipher type with aliases correctly', () => {
      const result = normalizeAndValidate('cipher', {
        cipherText: 'ABC',
        plaintext: 'XYZ',
      });

      expect(result.validation.ok).toBe(true);
      expect(result.canonical).toHaveProperty('encodedMessage', 'ABC');
      expect(result.canonical).toHaveProperty('expectedPlaintext', 'XYZ');
      expect(result.appliedAliases).toContain('cipherText → encodedMessage');
      expect(result.appliedAliases).toContain('plaintext → expectedPlaintext');
    });

    // =========================================================================
    // Test 6: unknown artifact_type → error
    // =========================================================================
    it('should return error for unknown artifact_type (POLICY: strict validation)', () => {
      const result = normalizeAndValidate('unknown_type_xyz', { foo: 'bar' });

      expect(result.validation.ok).toBe(false);
      expect(result.validation.errors).toContainEqual(
        expect.stringMatching(/Okänd artifact_type.*unknown_type_xyz/i)
      );
    });

    it('should pass for static types (card, document, image)', () => {
      const cardResult = normalizeAndValidate('card', { someField: 'value' });
      const docResult = normalizeAndValidate('document', {});
      const imgResult = normalizeAndValidate('image', {});

      expect(cardResult.validation.ok).toBe(true);
      expect(docResult.validation.ok).toBe(true);
      expect(imgResult.validation.ok).toBe(true);
    });
  });
});
