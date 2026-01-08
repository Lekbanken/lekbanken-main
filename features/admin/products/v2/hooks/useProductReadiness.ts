'use client';

import { useMemo } from 'react';
import type { ProductDetail } from '@/features/admin/products/v2/types';

// =============================================================================
// TYPES
// =============================================================================

export interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  passed: boolean;
  severity: 'blocker' | 'warning';
}

export interface ProductReadiness {
  /** Whether the product is ready to be activated */
  isReady: boolean;
  /** Blocking issues that prevent activation */
  blockers: ReadinessCheck[];
  /** Warnings that don't prevent activation */
  warnings: ReadinessCheck[];
  /** All checks */
  allChecks: ReadinessCheck[];
  /** Summary message */
  summary: string;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * useProductReadiness - Validates product readiness for activation
 * 
 * Checks all required fields and conditions before a product can be activated.
 * 
 * @example
 * const { isReady, blockers, warnings } = useProductReadiness(product);
 * 
 * if (!isReady) {
 *   console.log('Cannot activate:', blockers.map(b => b.label));
 * }
 */
export function useProductReadiness(product: ProductDetail | null): ProductReadiness {
  return useMemo(() => {
    if (!product) {
      return {
        isReady: false,
        blockers: [],
        warnings: [],
        allChecks: [],
        summary: 'Ingen produkt laddad',
      };
    }

    const checks: ReadinessCheck[] = [];

    // ==========================================================================
    // BLOCKER CHECKS (prevents activation)
    // ==========================================================================

    // 1. Name must exist
    checks.push({
      id: 'name',
      label: 'Produktnamn saknas',
      description: 'Produkten måste ha ett namn',
      passed: !!product.name && product.name.trim().length > 0,
      severity: 'blocker',
    });

    // 2. At least one active price
    const activePrices = product.prices?.filter(p => p.active) || [];
    checks.push({
      id: 'has_price',
      label: 'Minst ett aktivt pris',
      description: 'Produkten måste ha minst ett aktivt pris',
      passed: activePrices.length > 0,
      severity: 'blocker',
    });

    // 3. Price has amount > 0
    const validPrices = activePrices.filter(p => p.amount > 0);
    checks.push({
      id: 'price_amount',
      label: 'Pris har belopp',
      description: 'Alla aktiva priser måste ha ett belopp större än 0',
      passed: activePrices.length === 0 || validPrices.length > 0,
      severity: 'blocker',
    });

    // 4. Unit label must be set
    checks.push({
      id: 'unit_label',
      label: 'Enhetsetikett (unit_label)',
      description: 'Krävs för korrekt visning på faktura',
      passed: !!product.unit_label,
      severity: 'blocker',
    });

    // 5. Stripe synced (if product has stripe_product_id)
    if (product.stripe_product_id) {
      checks.push({
        id: 'stripe_synced',
        label: 'Stripe-synkad',
        description: 'Produkten måste vara synkad med Stripe',
        passed: product.stripe_linkage?.status === 'connected',
        severity: 'blocker',
      });
    }

    // ==========================================================================
    // WARNING CHECKS (recommended but not required)
    // ==========================================================================

    // 6. Statement descriptor for Nordic currencies
    const nordicPrices = activePrices.filter(p => 
      p.currency === 'NOK' || p.currency === 'SEK'
    );
    if (nordicPrices.length > 0) {
      checks.push({
        id: 'statement_descriptor',
        label: 'Kontoutdragstext saknas',
        description: 'Rekommenderas för NOK/SEK-priser (visas på kontoutdrag)',
        passed: !!product.statement_descriptor && product.statement_descriptor.length > 0,
        severity: 'warning',
      });
    }

    // 7. Customer description
    checks.push({
      id: 'customer_description',
      label: 'Kundbeskrivning saknas',
      description: 'Visas för kunder i Stripe Checkout',
      passed: !!product.customer_description && product.customer_description.length > 0,
      severity: 'warning',
    });

    // 8. Product image
    checks.push({
      id: 'image_url',
      label: 'Produktbild saknas',
      description: 'Visas i Stripe Checkout och på fakturor',
      passed: !!product.image_url && product.image_url.length > 0,
      severity: 'warning',
    });

    // 9. No stripe sync drift
    checks.push({
      id: 'no_drift',
      label: 'Stripe-drift detekterad',
      description: 'Lokala värden skiljer sig från Stripe',
      passed: product.stripe_linkage?.status !== 'drift',
      severity: 'warning',
    });

    // ==========================================================================
    // CALCULATE RESULTS
    // ==========================================================================

    const blockers = checks.filter(c => c.severity === 'blocker' && !c.passed);
    const warnings = checks.filter(c => c.severity === 'warning' && !c.passed);
    const isReady = blockers.length === 0;

    let summary: string;
    if (isReady && warnings.length === 0) {
      summary = 'Produkten är redo att aktiveras';
    } else if (isReady) {
      summary = `Kan aktiveras (${warnings.length} varning${warnings.length > 1 ? 'ar' : ''})`;
    } else {
      summary = `${blockers.length} krav ej uppfyllda`;
    }

    return {
      isReady,
      blockers,
      warnings,
      allChecks: checks,
      summary,
    };
  }, [product]);
}

// =============================================================================
// HELPER: Get activation tooltip
// =============================================================================

export function getActivationTooltip(readiness: ProductReadiness): string {
  if (readiness.isReady) {
    if (readiness.warnings.length > 0) {
      return `Kan aktiveras, men: ${readiness.warnings.map(w => w.label).join(', ')}`;
    }
    return 'Klicka för att aktivera produkten';
  }

  return `Kan inte aktiveras: ${readiness.blockers.map(b => b.label).join(', ')}`;
}
