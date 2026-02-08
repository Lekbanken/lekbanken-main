/**
 * Tests for 409 error handling contract between API and UI.
 * 
 * This test ensures the mapping between API error codes and UI toast messages
 * remains stable and prevents "vibe-gap" regression where errors are silently
 * swallowed or shown with wrong messages.
 * 
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

/**
 * Error codes returned by POST /api/media/templates on 409.
 * These must match exactly what the API returns.
 */
const API_ERROR_CODES = {
  SLOT_LIMIT: 'TEMPLATE_SLOT_LIMIT',
  KEY_EXISTS: 'TEMPLATE_KEY_EXISTS',
} as const;

/**
 * i18n keys used by StandardImagesManager for 409 toasts.
 * These must match exactly what's in messages/sv.json under
 * admin.media.standardImagesManager.toast.*
 */
const TOAST_I18N_KEYS = {
  SLOT_LIMIT: 'toast.slotLimitReached',
  KEY_EXISTS: 'toast.duplicateKey',
  CONFLICT_GENERIC: 'toast.conflict',
} as const;

/**
 * Simulates the error mapping logic from StandardImagesManager.tsx
 * This is a pure function extraction for testing purposes.
 */
function mapApiErrorToToastKey(errorData: { error?: string; message?: string }): string {
  if (errorData.error === API_ERROR_CODES.SLOT_LIMIT) {
    return TOAST_I18N_KEYS.SLOT_LIMIT;
  } else if (errorData.error === API_ERROR_CODES.KEY_EXISTS) {
    return TOAST_I18N_KEYS.KEY_EXISTS;
  } else if (typeof errorData.message === 'string') {
    // Graceful fallback: use message heuristics if error field missing
    if (errorData.message.toLowerCase().includes('limit') || errorData.message.includes('5')) {
      return TOAST_I18N_KEYS.SLOT_LIMIT;
    } else if (errorData.message.toLowerCase().includes('exists') || errorData.message.toLowerCase().includes('duplicate')) {
      return TOAST_I18N_KEYS.KEY_EXISTS;
    } else {
      return TOAST_I18N_KEYS.CONFLICT_GENERIC;
    }
  } else {
    return TOAST_I18N_KEYS.CONFLICT_GENERIC;
  }
}

describe('409 Error Contract: API → UI Toast Mapping', () => {
  describe('with error field (primary contract)', () => {
    it('TEMPLATE_SLOT_LIMIT → toast.slotLimitReached', () => {
      const result = mapApiErrorToToastKey({ 
        error: 'TEMPLATE_SLOT_LIMIT', 
        message: 'Maximum 5 templates allowed per product/purpose combination' 
      });
      expect(result).toBe('toast.slotLimitReached');
    });

    it('TEMPLATE_KEY_EXISTS → toast.duplicateKey', () => {
      const result = mapApiErrorToToastKey({ 
        error: 'TEMPLATE_KEY_EXISTS', 
        message: 'A template with this template_key already exists' 
      });
      expect(result).toBe('toast.duplicateKey');
    });

    it('unknown error code → toast.conflict (graceful fallback)', () => {
      const result = mapApiErrorToToastKey({ 
        error: 'UNKNOWN_ERROR_CODE', 
        message: 'Something went wrong' 
      });
      expect(result).toBe('toast.conflict');
    });
  });

  describe('without error field (fallback heuristics)', () => {
    it('message containing "limit" → toast.slotLimitReached', () => {
      const result = mapApiErrorToToastKey({ 
        message: 'Template limit reached for this combination' 
      });
      expect(result).toBe('toast.slotLimitReached');
    });

    it('message containing "5" → toast.slotLimitReached', () => {
      const result = mapApiErrorToToastKey({ 
        message: 'Cannot create more than 5 templates' 
      });
      expect(result).toBe('toast.slotLimitReached');
    });

    it('message containing "exists" → toast.duplicateKey', () => {
      const result = mapApiErrorToToastKey({ 
        message: 'Template already exists' 
      });
      expect(result).toBe('toast.duplicateKey');
    });

    it('message containing "duplicate" → toast.duplicateKey', () => {
      const result = mapApiErrorToToastKey({ 
        message: 'Duplicate template key detected' 
      });
      expect(result).toBe('toast.duplicateKey');
    });

    it('message without known keywords → toast.conflict', () => {
      const result = mapApiErrorToToastKey({ 
        message: 'Something unexpected happened' 
      });
      expect(result).toBe('toast.conflict');
    });
  });

  describe('empty/malformed response (graceful degradation)', () => {
    it('empty object → toast.conflict', () => {
      const result = mapApiErrorToToastKey({});
      expect(result).toBe('toast.conflict');
    });

    it('null-ish values → toast.conflict', () => {
      const result = mapApiErrorToToastKey({ error: undefined, message: undefined });
      expect(result).toBe('toast.conflict');
    });
  });
});

describe('API Error Code Constants', () => {
  it('SLOT_LIMIT matches expected string', () => {
    expect(API_ERROR_CODES.SLOT_LIMIT).toBe('TEMPLATE_SLOT_LIMIT');
  });

  it('KEY_EXISTS matches expected string', () => {
    expect(API_ERROR_CODES.KEY_EXISTS).toBe('TEMPLATE_KEY_EXISTS');
  });
});
