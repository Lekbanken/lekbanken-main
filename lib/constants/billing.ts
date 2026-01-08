/**
 * Billing Constants
 * 
 * Centralized constants for billing, pricing, and Stripe-related values.
 * Used across admin products, pricing, and sync components.
 */

// =============================================================================
// CURRENCY
// =============================================================================

export const CURRENCIES = [
  { value: 'NOK', label: 'NOK', symbol: 'kr', locale: 'nb-NO' },
  { value: 'SEK', label: 'SEK', symbol: 'kr', locale: 'sv-SE' },
  { value: 'EUR', label: 'EUR', symbol: '€', locale: 'de-DE' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['value'];

export function getCurrencySymbol(currency: string): string {
  return CURRENCIES.find(c => c.value === currency)?.symbol || currency;
}

export function formatCurrency(amountInSmallestUnit: number, currency: string): string {
  const currencyInfo = CURRENCIES.find(c => c.value === currency);
  const amount = amountInSmallestUnit / 100;
  
  if (currencyInfo) {
    return new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currencyInfo.value,
    }).format(amount);
  }
  
  return `${amount} ${currency}`;
}

// =============================================================================
// INTERVALS
// =============================================================================

export const INTERVALS = [
  { value: 'month', label: 'Månadsvis', shortLabel: 'mån' },
  { value: 'year', label: 'Årsvis', shortLabel: 'år' },
  { value: 'one_time', label: 'Engångsköp', shortLabel: 'engång' },
] as const;

export type IntervalType = typeof INTERVALS[number]['value'];

export function getIntervalLabel(interval: string): string {
  return INTERVALS.find(i => i.value === interval)?.label || interval;
}

export function getIntervalShortLabel(interval: string): string {
  return INTERVALS.find(i => i.value === interval)?.shortLabel || interval;
}

// =============================================================================
// TAX BEHAVIOR
// =============================================================================

export const TAX_BEHAVIORS = [
  { value: 'exclusive', label: 'Moms exklusive', description: 'Moms läggs till på beloppet' },
  { value: 'inclusive', label: 'Moms inklusive', description: 'Beloppet inkluderar moms' },
  { value: 'unspecified', label: 'Ospecificerad', description: 'Stripe avgör baserat på kund' },
] as const;

export type TaxBehaviorType = typeof TAX_BEHAVIORS[number]['value'];

export function getTaxBehaviorLabel(taxBehavior: string): string {
  return TAX_BEHAVIORS.find(t => t.value === taxBehavior)?.label || taxBehavior;
}

// =============================================================================
// UNIT LABELS
// =============================================================================

export const UNIT_LABELS = [
  { value: 'seat', label: 'Platser (seats)', example: '3 seats × 299 kr' },
  { value: 'license', label: 'Licenser', example: '3 licenses × 299 kr' },
  { value: 'user', label: 'Användare', example: '3 users × 299 kr' },
] as const;

export type UnitLabelType = typeof UNIT_LABELS[number]['value'];

export function getUnitLabelDisplay(unitLabel: string): string {
  return UNIT_LABELS.find(u => u.value === unitLabel)?.label || unitLabel;
}

// =============================================================================
// BILLING MODELS
// =============================================================================

export const BILLING_MODELS = [
  { value: 'per_seat', label: 'Per plats', description: 'Faktureras per antal platser' },
  { value: 'per_tenant', label: 'Per organisation', description: 'Fast pris per organisation' },
  { value: 'per_user', label: 'Per användare', description: 'Faktureras per aktiv användare' },
  { value: 'flat', label: 'Fast pris', description: 'Fast månadspris oavsett användning' },
] as const;

export type BillingModelType = typeof BILLING_MODELS[number]['value'];

// =============================================================================
// PRODUCT STATUS
// =============================================================================

export const PRODUCT_STATUSES = [
  { value: 'draft', label: 'Utkast', variant: 'secondary' as const, description: 'Ej synlig för kunder' },
  { value: 'active', label: 'Aktiv', variant: 'default' as const, description: 'Synlig och köpbar' },
  { value: 'archived', label: 'Arkiverad', variant: 'outline' as const, description: 'Dold, ej köpbar' },
] as const;

export type ProductStatusType = typeof PRODUCT_STATUSES[number]['value'];

// =============================================================================
// STRIPE SYNC STATUS
// =============================================================================

export const STRIPE_SYNC_STATUSES = [
  { value: 'unsynced', label: 'Ej synkad', variant: 'secondary' as const, icon: '⏳' },
  { value: 'synced', label: 'Synkad', variant: 'default' as const, icon: '✅' },
  { value: 'drift', label: 'Drift', variant: 'warning' as const, icon: '⚠️' },
  { value: 'error', label: 'Fel', variant: 'destructive' as const, icon: '❌' },
  { value: 'locked', label: 'Låst', variant: 'destructive' as const, icon: '🔒' },
] as const;

export type StripeSyncStatusType = typeof STRIPE_SYNC_STATUSES[number]['value'];

// =============================================================================
// TARGET AUDIENCE
// =============================================================================

export const TARGET_AUDIENCES = [
  { value: 'all', label: 'Alla' },
  { value: 'schools', label: 'Skolor' },
  { value: 'kindergartens', label: 'Förskolor' },
  { value: 'fritids', label: 'Fritids' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export type TargetAudienceType = typeof TARGET_AUDIENCES[number]['value'];

// =============================================================================
// FEATURE TIERS
// =============================================================================

export const FEATURE_TIERS = [
  { value: 'free', label: 'Free', color: 'gray' },
  { value: 'standard', label: 'Standard', color: 'blue' },
  { value: 'premium', label: 'Premium', color: 'purple' },
  { value: 'enterprise', label: 'Enterprise', color: 'gold' },
] as const;

export type FeatureTierType = typeof FEATURE_TIERS[number]['value'];

// =============================================================================
// PRODUCT TYPES
// =============================================================================

export const PRODUCT_TYPES = [
  { value: 'license', label: 'Licens', description: 'Baslicens för åtkomst' },
  { value: 'addon', label: 'Tillägg', description: 'Extra funktionalitet' },
  { value: 'consumable', label: 'Förbrukningsvara', description: 'Engångsanvändning' },
  { value: 'one_time', label: 'Engångsköp', description: 'Köps en gång' },
  { value: 'bundle', label: 'Paket', description: 'Kombination av produkter' },
] as const;

export type ProductTypeValue = typeof PRODUCT_TYPES[number]['value'];
