'use client';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// =============================================================================
// PRODUCT STATUS BADGE
// =============================================================================

export type ProductStatus = 'draft' | 'active' | 'archived';

const PRODUCT_STATUS_CONFIG: Record<ProductStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: { label: 'Utkast', variant: 'secondary' },
  active: { label: 'Aktiv', variant: 'default' },
  archived: { label: 'Arkiverad', variant: 'outline' },
};

interface ProductStatusBadgeProps {
  status: ProductStatus;
  className?: string;
}

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  const config = PRODUCT_STATUS_CONFIG[status] || PRODUCT_STATUS_CONFIG.draft;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

// =============================================================================
// STRIPE SYNC STATUS BADGE
// =============================================================================

export type StripeSyncStatus = 'unsynced' | 'synced' | 'drift' | 'error' | 'locked';

const STRIPE_SYNC_CONFIG: Record<StripeSyncStatus, { 
  label: string; 
  variant: BadgeProps['variant']; 
  icon: string;
  description: string;
}> = {
  unsynced: { 
    label: 'Ej synkad', 
    variant: 'secondary', 
    icon: '⏳',
    description: 'Produkten har inte synkats till Stripe',
  },
  synced: { 
    label: 'Synkad', 
    variant: 'default', 
    icon: '✅',
    description: 'Produkten är synkad med Stripe',
  },
  drift: { 
    label: 'Drift', 
    variant: 'outline', 
    icon: '⚠️',
    description: 'Lokala ändringar skiljer sig från Stripe',
  },
  error: { 
    label: 'Fel', 
    variant: 'destructive', 
    icon: '❌',
    description: 'Synkronisering misslyckades',
  },
  locked: { 
    label: 'Låst', 
    variant: 'destructive', 
    icon: '🔒',
    description: 'Synkronisering låst - kontakta support',
  },
};

interface StripeSyncStatusBadgeProps {
  status: StripeSyncStatus;
  className?: string;
  showIcon?: boolean;
}

export function StripeSyncStatusBadge({ status, className, showIcon = true }: StripeSyncStatusBadgeProps) {
  const config = STRIPE_SYNC_CONFIG[status] || STRIPE_SYNC_CONFIG.unsynced;
  return (
    <Badge 
      variant={config.variant} 
      className={cn('gap-1', className)}
      title={config.description}
    >
      {showIcon && <span>{config.icon}</span>}
      {config.label}
    </Badge>
  );
}

// =============================================================================
// HEALTH STATUS BADGE
// =============================================================================

export type HealthStatus = 'ok' | 'missing_fields' | 'stripe_drift' | 'availability_misconfig' | 'no_price';

const HEALTH_STATUS_CONFIG: Record<HealthStatus, { 
  label: string; 
  variant: BadgeProps['variant'];
  icon: string;
}> = {
  ok: { label: 'OK', variant: 'default', icon: '✓' },
  missing_fields: { label: 'Saknade fält', variant: 'destructive', icon: '!' },
  stripe_drift: { label: 'Stripe drift', variant: 'outline', icon: '⚠' },
  availability_misconfig: { label: 'Tillgänglighetsfel', variant: 'destructive', icon: '!' },
  no_price: { label: 'Saknar pris', variant: 'destructive', icon: '!' },
};

interface HealthStatusBadgeProps {
  status: HealthStatus;
  className?: string;
}

export function HealthStatusBadge({ status, className }: HealthStatusBadgeProps) {
  const config = HEALTH_STATUS_CONFIG[status] || HEALTH_STATUS_CONFIG.ok;
  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      <span>{config.icon}</span>
      {config.label}
    </Badge>
  );
}

// =============================================================================
// STRIPE LINKAGE BADGE
// =============================================================================

export type StripeLinkageStatus = 'connected' | 'missing' | 'drift';

const STRIPE_LINKAGE_CONFIG: Record<StripeLinkageStatus, { 
  label: string; 
  variant: BadgeProps['variant'];
}> = {
  connected: { label: 'Kopplad', variant: 'default' },
  missing: { label: 'Ej kopplad', variant: 'secondary' },
  drift: { label: 'Drift', variant: 'outline' },
};

interface StripeLinkageBadgeProps {
  status: StripeLinkageStatus;
  className?: string;
}

export function StripeLinkageBadge({ status, className }: StripeLinkageBadgeProps) {
  const config = STRIPE_LINKAGE_CONFIG[status] || STRIPE_LINKAGE_CONFIG.missing;
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
