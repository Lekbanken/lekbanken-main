/**
 * Tests for template key generation utilities.
 * 
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  slugify,
  generateTemplateKey,
  parseTemplateKey,
  canCreateTemplate,
  MAX_TEMPLATES_PER_COMBO,
} from '@/lib/media/templateKey';

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('handles Swedish characters', () => {
    expect(slugify('Samarbete & Gemenskap')).toBe('samarbete-och-gemenskap');
    expect(slugify('Motorik & Rörelse')).toBe('motorik-och-rorelse');
    expect(slugify('Kognition & Fokus')).toBe('kognition-och-fokus');
    expect(slugify('Självutveckling & Emotionell Medvetenhet')).toBe('sjalvutveckling-och-emotionell-medvetenhet');
  });

  it('handles åäö', () => {
    expect(slugify('åäö')).toBe('aao');
    expect(slugify('Träning')).toBe('traning');
    expect(slugify('Övning')).toBe('ovning');
  });

  it('removes special characters', () => {
    expect(slugify('Test!@#$%^&*()')).toBe('test-och');
    expect(slugify('one   two   three')).toBe('one-two-three');
  });

  it('handles empty and whitespace', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
    expect(slugify('  hello  ')).toBe('hello');
  });

  it('removes leading and trailing dashes', () => {
    expect(slugify('---hello---')).toBe('hello');
    expect(slugify('!hello!')).toBe('hello');
  });
});

describe('generateTemplateKey', () => {
  it('generates global key format when no product', () => {
    const result = generateTemplateKey({
      productId: null,
      productName: null,
      purposeId: 'purpose-123',
      purposeName: 'Samarbete & Gemenskap',
      existingTemplateKeys: [],
    });

    expect(result.templateKey).toBe('std_samarbete-och-gemenskap_1');
    expect(result.suggestedName).toBe('Samarbete & Gemenskap 1');
    expect(result.slotNumber).toBe(1);
  });

  it('generates product-specific key format', () => {
    const result = generateTemplateKey({
      productId: 'prod-123',
      productName: 'Basket',
      purposeId: 'purpose-123',
      purposeName: 'Motorik & Rörelse',
      existingTemplateKeys: [],
    });

    expect(result.templateKey).toBe('std_basket_motorik-och-rorelse_1');
    expect(result.suggestedName).toBe('Motorik & Rörelse – Basket 1');
    expect(result.slotNumber).toBe(1);
  });

  it('finds next available slot number', () => {
    const existingKeys = [
      'std_samarbete-och-gemenskap_1',
      'std_samarbete-och-gemenskap_2',
      'std_samarbete-och-gemenskap_4', // Gap at 3
    ];

    const result = generateTemplateKey({
      productId: null,
      productName: null,
      purposeId: 'purpose-123',
      purposeName: 'Samarbete & Gemenskap',
      existingTemplateKeys: existingKeys,
    });

    expect(result.slotNumber).toBe(3); // Fills the gap
    expect(result.templateKey).toBe('std_samarbete-och-gemenskap_3');
  });

  it('continues after highest number when no gaps', () => {
    const existingKeys = [
      'std_samarbete-och-gemenskap_1',
      'std_samarbete-och-gemenskap_2',
      'std_samarbete-och-gemenskap_3',
    ];

    const result = generateTemplateKey({
      productId: null,
      productName: null,
      purposeId: 'purpose-123',
      purposeName: 'Samarbete & Gemenskap',
      existingTemplateKeys: existingKeys,
    });

    expect(result.slotNumber).toBe(4);
    expect(result.templateKey).toBe('std_samarbete-och-gemenskap_4');
  });

  it('ignores unrelated keys', () => {
    const existingKeys = [
      'std_motorik-och-rorelse_1',
      'std_motorik-och-rorelse_2',
      'std_other-purpose_1',
    ];

    const result = generateTemplateKey({
      productId: null,
      productName: null,
      purposeId: 'purpose-123',
      purposeName: 'Samarbete & Gemenskap',
      existingTemplateKeys: existingKeys,
    });

    expect(result.slotNumber).toBe(1); // No collision with other purposes
    expect(result.templateKey).toBe('std_samarbete-och-gemenskap_1');
  });
});

describe('parseTemplateKey', () => {
  it('parses global format', () => {
    const result = parseTemplateKey('std_samarbete-och-gemenskap_3');
    expect(result).toEqual({
      productSlug: null,
      purposeSlug: 'samarbete-och-gemenskap',
      slotNumber: 3,
    });
  });

  it('parses product format', () => {
    const result = parseTemplateKey('std_basket_motorik-och-rorelse_2');
    expect(result).toEqual({
      productSlug: 'basket',
      purposeSlug: 'motorik-och-rorelse',
      slotNumber: 2,
    });
  });

  it('returns null for invalid format', () => {
    expect(parseTemplateKey('invalid_key')).toBeNull();
    expect(parseTemplateKey('std_noslot')).toBeNull();
    expect(parseTemplateKey('std_too_many_parts_here_5')).toBeNull();
  });
});

describe('canCreateTemplate', () => {
  it('allows creation when under limit', () => {
    expect(canCreateTemplate(0)).toBe(true);
    expect(canCreateTemplate(4)).toBe(true);
  });

  it('blocks creation at limit', () => {
    expect(canCreateTemplate(5)).toBe(false);
    expect(canCreateTemplate(6)).toBe(false);
  });

  it('MAX_TEMPLATES_PER_COMBO is 5', () => {
    expect(MAX_TEMPLATES_PER_COMBO).toBe(5);
  });
});
