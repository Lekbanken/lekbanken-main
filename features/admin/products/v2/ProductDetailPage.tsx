'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  formatCurrencyWithDecimals as formatCurrency,
  formatDateLong as formatDate,
  formatDateTimeLong as formatDateTime,
} from '@/lib/i18n/format-utils';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CubeIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  LinkIcon,
  CurrencyDollarIcon,
  KeyIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminPageHeader,
  AdminPageLayout,
  AdminErrorState,
} from '@/components/admin/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs';
import { useToast } from '@/components/ui';
import type {
  ProductDetail,
  ProductCardTab,
  ProductStatus,
  StripeLinkageStatus,
  HealthStatus,
  UnitLabel,
} from './types';
import {
  PRODUCT_STATUS_META,
  PRODUCT_TYPE_META,
  STRIPE_LINKAGE_META,
  HEALTH_STATUS_META,
  AVAILABILITY_SCOPE_META,
  PRICE_INTERVAL_META,
  AUDIT_EVENT_META,
} from './types';
import { SyncStatusBadge, DriftWarning } from '@/components/admin/SyncStatusBadge';
import { type StripeSyncStatus, STRIPE_SYNC_STATUS } from '@/lib/stripe/product-sync-types';
import { PriceManager } from './PriceManager';
import { StripeTab as StripeTabComponent } from './StripeTab';
import { CopyButton } from '@/components/ui/copy-button';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

// CopyButton is now imported from @/components/ui/copy-button

function StatusBadge({ status }: { status: ProductStatus }) {
  const meta = PRODUCT_STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

function StripeBadge({ status }: { status: StripeLinkageStatus }) {
  const meta = STRIPE_LINKAGE_META[status];
  return (
    <Badge variant={meta.variant} className="gap-1">
      <LinkIcon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

function HealthBadge({ status, issues }: { status: HealthStatus; issues?: string[] }) {
  const t = useTranslations('admin.products.v2.detail');
  const meta = HEALTH_STATUS_META[status];
  const Icon = status === 'ok' ? CheckCircleIcon : ExclamationTriangleIcon;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={status === 'ok' ? 'default' : 'destructive'}
        className="gap-1"
        style={{ backgroundColor: status === 'ok' ? meta.color : undefined }}
      >
        <Icon className="h-3 w-3" />
        {meta.label}
      </Badge>
      {issues && issues.length > 0 && (
        <span className="text-xs text-muted-foreground">({issues.length} {t('overview.issues')})</span>
      )}
    </div>
  );
}

function InfoRow({ label, children, copyValue }: { label: string; children: React.ReactNode; copyValue?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="text-sm font-medium max-w-[60%]">{children}</span>
        {copyValue && <CopyButton text={copyValue} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ============================================================================
// TAB COMPONENTS (simplified versions)
// ============================================================================

function OverviewTab({ product, onRefresh, onNavigateToTab }: { 
  product: ProductDetail; 
  onRefresh: () => void;
  onNavigateToTab: (tab: ProductCardTab) => void;
}) {
  const t = useTranslations('admin.products.v2.detail');
  const typeMeta = PRODUCT_TYPE_META[product.product_type];
  const checklist = product.publish_checklist;
  const linkage = product.stripe_linkage;
  
  const isReadyToPublish = checklist?.has_valid_price && 
    // Note: Entitlements check disabled until feature is implemented
    checklist?.availability_rules_valid && 
    checklist?.stripe_linkage_ok;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Quick Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t('overview.stats.prices')} value={product.prices_count} icon={CurrencyDollarIcon} />
          <StatCard label={t('overview.stats.entitlements')} value={product.entitlements?.length ?? 0} icon={KeyIcon} />
          <StatCard label={t('overview.stats.organizations')} value={product.assigned_tenants_count} icon={BuildingOfficeIcon} />
          <StatCard label={t('overview.stats.lastUpdated')} value={formatDate(product.updated_at)} icon={ClockIcon} />
        </div>

        {/* Health Issues */}
        {product.health_issues && product.health_issues.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {t('overview.healthIssues')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {product.health_issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <XCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{issue}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              {t('overview.quickActions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToTab('pricing')}
                className="text-xs"
              >
                <CurrencyDollarIcon className="h-3.5 w-3.5 mr-1" />
                {t('overview.managePrices')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToTab('stripe')}
                className="text-xs"
              >
                <LinkIcon className="h-3.5 w-3.5 mr-1" />
                {t('overview.stripeSettings')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToTab('entitlements')}
                className="text-xs"
              >
                <KeyIcon className="h-3.5 w-3.5 mr-1" />
                {t('overview.stats.entitlements')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToTab('lifecycle')}
                className="text-xs"
              >
                <ClockIcon className="h-3.5 w-3.5 mr-1" />
                {t('tabs.lifecycle')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core Info + Stripe Status */}
      <div className="space-y-4">
        {/* Readiness Banner */}
        <Card className={isReadyToPublish ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20'}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isReadyToPublish ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t('overview.readyForPublish')}</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('overview.notReadyForPublish')}</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToTab('lifecycle')}
                className="text-xs"
              >
                {t('overview.viewChecklist')}
                <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CubeIcon className="h-4 w-4" />
              {t('overview.basicInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label={t('overview.uuid')} copyValue={product.id}>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {product.id.slice(0, 8)}...
              </code>
            </InfoRow>
            <InfoRow label={t('overview.productKey')} copyValue={product.product_key || ''}>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {product.product_key || '—'}
              </code>
            </InfoRow>
            <InfoRow label={t('overview.type')}>
              <Badge variant="outline">{typeMeta.label}</Badge>
            </InfoRow>
            <InfoRow label={t('overview.category')}>{product.category || '—'}</InfoRow>
            <InfoRow label={t('overview.status')}><StatusBadge status={product.status} /></InfoRow>
          </CardContent>
        </Card>

        {/* Stripe Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {t('overview.stripeStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label={t('overview.linkage')}><StripeBadge status={linkage.status} /></InfoRow>
            <InfoRow label={t('overview.stripeId')} copyValue={linkage.stripe_product_id || ''}>
              {linkage.stripe_product_id ? (
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {linkage.stripe_product_id.slice(0, 16)}...
                </code>
              ) : (
                <span className="text-muted-foreground">{t('overview.notLinked')}</span>
              )}
            </InfoRow>
            <InfoRow label={t('overview.lastSynced')}>{formatDateTime(linkage.last_synced_at)}</InfoRow>
            <InfoRow label={t('overview.activePrices')}>{linkage.active_prices_count}</InfoRow>
            <InfoRow label={t('overview.unitLabel')}>
              <Badge variant="outline">{product.unit_label || 'seat'}</Badge>
            </InfoRow>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              {t('overview.descriptions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('overview.internalDescription')}</p>
              <p className="text-sm">{product.internal_description || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('overview.customerDescription')}</p>
              <p className="text-sm">{product.customer_description || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PricingTab({ product, onRefresh }: { product: ProductDetail; onRefresh: () => void }) {
  const t = useTranslations('admin.products.v2.detail');
  const linkage = product.stripe_linkage;
  
  // Wrapper for PriceManager callback
  const refreshProduct = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Stripe Linkage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            {t('pricing.stripeLinkage')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label={t('overview.status')}><StripeBadge status={linkage.status} /></InfoRow>
          <InfoRow label={t('overview.stripeId')} copyValue={linkage.stripe_product_id || ''}>
            {linkage.stripe_product_id ? (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{linkage.stripe_product_id}</code>
            ) : (
              <span className="text-muted-foreground">{t('overview.notLinked')}</span>
            )}
          </InfoRow>
          <InfoRow label={t('overview.lastSynced')}>{formatDateTime(linkage.last_synced_at)}</InfoRow>
          <InfoRow label={t('overview.activePrices')}>{linkage.active_prices_count}</InfoRow>
        </CardContent>
      </Card>

      {/* Prices Table */}
      <PriceManager
        productId={product.id}
        productName={product.name}
        stripeProductId={product.stripe_product_id ?? null}
        prices={(product.prices ?? []).map(p => ({
          id: p.id,
          product_id: product.id,
          stripe_price_id: p.stripe_price_id ?? null,
          amount: p.amount,
          currency: p.currency as 'SEK' | 'NOK' | 'EUR',
          interval: p.interval as 'month' | 'year' | 'one_time',
          interval_count: p.interval_count ?? 1,
          tax_behavior: p.tax_behavior ?? 'inclusive',
          billing_model: p.billing_model ?? 'standard',
          lookup_key: p.lookup_key ?? null,
          trial_period_days: p.trial_period_days ?? 0,
          nickname: p.nickname ?? null,
          is_default: p.is_default ?? false,
          active: p.active,
        }))}
        onPricesChanged={refreshProduct}
      />
    </div>
  );
}

function EntitlementsTab({ product }: { product: ProductDetail }) {
  const t = useTranslations('admin.products.v2.detail');
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyIcon className="h-4 w-4" />
            {t('entitlements.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.entitlements || product.entitlements.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <KeyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('entitlements.noEntitlements')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {product.entitlements.map((ent) => (
                <div key={ent.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${ent.enabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium">{ent.feature_label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{ent.feature_key}</p>
                    </div>
                  </div>
                  <Badge variant={ent.enabled ? 'default' : 'secondary'}>{ent.enabled ? t('entitlements.enabled') : t('entitlements.disabled')}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            {t('entitlements.dependencies')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.dependencies || product.dependencies.length === 0) ? (
            <div className="py-4 text-center text-muted-foreground text-sm">{t('entitlements.noDependencies')}</div>
          ) : (
            <div className="space-y-2">
              {product.dependencies.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={dep.dependency_type === 'requires' ? 'default' : 'destructive'}>
                      {dep.dependency_type === 'requires' ? t('entitlements.requires') : t('entitlements.excludes')}
                    </Badge>
                    <span className="text-sm">{dep.target_product_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AvailabilityTab({ product }: { product: ProductDetail }) {
  const t = useTranslations('admin.products.v2.detail');
  const availability = product.availability;
  const scopeMeta = AVAILABILITY_SCOPE_META[availability?.scope ?? 'global'];
  const tenantAssignments = availability?.tenant_assignments ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Scope & License Model */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4" />
            {t('availability.scope')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <InfoRow label={t('availability.scopeLabel')}>
            <Badge variant="outline" className="flex items-center gap-1.5">
              {scopeMeta.label}
            </Badge>
          </InfoRow>
          <InfoRow label={t('availability.description')}>{scopeMeta.description}</InfoRow>
          <InfoRow label={t('availability.licenseModel')}>
            {availability?.license_model === 'per_tenant' && t('availability.perTenant')}
            {availability?.license_model === 'per_seat' && t('availability.perSeat')}
            {availability?.license_model === 'per_user' && t('availability.perUser')}
            {!availability?.license_model && '—'}
          </InfoRow>
          
          {/* Seat Limits Info */}
          <div className="pt-3 mt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">{t('availability.minSeats')}</span>
                <span className="font-medium">{product.min_seats ?? 1}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">{t('availability.maxSeats')}</span>
                <span className="font-medium">{product.max_seats ?? 100}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Assignments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4" />
            {t('availability.tenantAssignments')}
            {tenantAssignments.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {t('availability.orgs', { count: tenantAssignments.length })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {tenantAssignments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <BuildingOfficeIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('availability.noTenants')}</p>
              <p className="text-xs mt-1">
                {availability?.scope === 'global' 
                  ? t('availability.availableForAll')
                  : t('availability.addOrgsForAccess')}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tenantAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-sm">{assignment.tenant_name}</span>
                  <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {assignment.status === 'active' ? t('availability.active') : t('availability.pending')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Info Card */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            {t('availability.aboutAvailability')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <strong className="text-foreground block mb-1">{t('availability.global')}</strong>
              {t('availability.globalDescription')}
            </div>
            <div>
              <strong className="text-foreground block mb-1">{t('availability.tenantSpecific')}</strong>
              {t('availability.tenantSpecificDescription')}
            </div>
            <div>
              <strong className="text-foreground block mb-1">{t('availability.regional')}</strong>
              {t('availability.regionalDescription')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LifecycleTab({ product, onRefresh }: { product: ProductDetail; onRefresh: () => void }) {
  const t = useTranslations('admin.products.v2.detail');
  const { success, error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const lifecycle = product.lifecycle;
  const checklist = product.publish_checklist;
  const events = product.recent_audit_events || [];
  
  const handleStatusChange = useCallback(async (newStatus: 'active' | 'inactive' | 'archived') => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('lifecycle.statusChangeFailed'));
      }
      
      const statusLabel = newStatus === 'active' ? t('lifecycle.statusActive') : newStatus === 'inactive' ? t('lifecycle.statusInactive') : t('lifecycle.statusArchived');
      success(t('lifecycle.statusChangedTo', { status: statusLabel }));
      onRefresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('lifecycle.statusChangeFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [product.id, success, toastError, onRefresh, t]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Current State */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            {t('lifecycle.currentState')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <InfoRow label={t('overview.status')}><StatusBadge status={product.status} /></InfoRow>
          <InfoRow label={t('lifecycle.canActivate')}>
            {lifecycle?.can_activate ? (
              <Badge variant="default" className="bg-emerald-500">{t('lifecycle.yes')}</Badge>
            ) : (
              <Badge variant="secondary">{t('lifecycle.no')}</Badge>
            )}
          </InfoRow>
          <InfoRow label={t('lifecycle.canArchive')}>
            {lifecycle?.can_archive ? (
              <Badge variant="default" className="bg-emerald-500">{t('lifecycle.yes')}</Badge>
            ) : (
              <Badge variant="secondary">{t('lifecycle.no')}</Badge>
            )}
          </InfoRow>
          
          {/* Status Actions */}
          <div className="pt-3 mt-3 border-t border-border flex flex-wrap gap-2">
            {product.status === 'draft' && lifecycle?.can_activate && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('active')}
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isLoading ? t('lifecycle.activating') : t('lifecycle.activate')}
              </Button>
            )}
            {product.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('inactive')}
                disabled={isLoading}
              >
                {isLoading ? t('lifecycle.deactivating') : t('lifecycle.deactivate')}
              </Button>
            )}
            {lifecycle?.can_archive && product.status !== 'archived' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleStatusChange('archived')}
                disabled={isLoading}
              >
                {isLoading ? t('lifecycle.archiving') : t('lifecycle.archive')}
              </Button>
            )}
          </div>
          
          {/* Timestamps */}
          <div className="pt-3 mt-3 border-t border-border">
            <InfoRow label={t('lifecycle.created')}>{formatDateTime(product.created_at)}</InfoRow>
            <InfoRow label={t('lifecycle.updated')}>{formatDateTime(product.updated_at)}</InfoRow>
          </div>
        </CardContent>
      </Card>

      {/* Publishing Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            {t('lifecycle.publishChecklist')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <ChecklistItem label={t('lifecycle.hasValidPrice')} passed={checklist?.has_valid_price ?? false} />
          {/* Entitlements check disabled until feature is implemented */}
          {/* <ChecklistItem label="Har entitlements" passed={checklist?.has_entitlements ?? false} /> */}
          <ChecklistItem label={t('lifecycle.availabilityRulesOk')} passed={checklist?.availability_rules_valid ?? false} />
          <ChecklistItem label={t('lifecycle.stripeLinkageOk')} passed={checklist?.stripe_linkage_ok ?? false} />
          
          {/* Readiness Summary */}
          <div className="pt-3 mt-3 border-t border-border">
            {checklist?.has_valid_price && 
             checklist?.availability_rules_valid && checklist?.stripe_linkage_ok ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">{t('lifecycle.readyForPublish')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">{t('lifecycle.notReadyForPublish')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Audit Log */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            {t('lifecycle.eventLog')}
            {events.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {t('lifecycle.events', { count: events.length })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {events.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('lifecycle.noEvents')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {events.map((event, index) => {
                const eventMeta = AUDIT_EVENT_META[event.event_type as keyof typeof AUDIT_EVENT_META] || {
                  label: event.event_type,
                  color: '#6b7280',
                };
                return (
                  <div 
                    key={event.id} 
                    className={`flex items-start gap-3 py-2 ${index < events.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <div className="flex-shrink-0 mt-1.5">
                      <div 
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: eventMeta.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {eventMeta.label}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(event.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.actor_email || 'System'}
                      </p>
                      {/* Show event details for certain types */}
                      {event.event_data && Object.keys(event.event_data).length > 0 && (
                        <EventDetails eventType={event.event_type} data={event.event_data} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {passed ? (
        <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={`text-sm ${passed ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}

function EventDetails({ eventType, data }: { eventType: string; data: Record<string, unknown> }) {
  const t = useTranslations('admin.products.v2.detail');
  // Only show details for certain event types
  if (eventType === 'field_updated' && data.changes) {
    const changes = data.changes as Record<string, { old: unknown; new: unknown }>;
    const fieldNames = Object.keys(changes);
    if (fieldNames.length === 0) return null;
    return (
      <div className="mt-1 text-xs text-muted-foreground">
        {t('lifecycle.changedFields', { fields: fieldNames.join(', ') })}
      </div>
    );
  }
  
  if (eventType === 'status_changed' && data.old_status && data.new_status) {
    return (
      <div className="mt-1 text-xs text-muted-foreground">
        {String(data.old_status)} → {String(data.new_status)}
      </div>
    );
  }
  
  if ((eventType === 'price_created' || eventType === 'price_updated' || eventType === 'price_deleted') && data.amount) {
    const amount = (data.amount as number) / 100;
    const currency = data.currency as string || 'SEK';
    const interval = data.interval as string || '';
    return (
      <div className="mt-1 text-xs text-muted-foreground">
        {amount.toFixed(2)} {currency} {interval && `(${interval})`}
      </div>
    );
  }
  
  if (eventType === 'stripe_sync_failed' && data.error) {
    return (
      <div className="mt-1 text-xs text-red-500">
        {t('lifecycle.error', { error: String(data.error) })}
      </div>
    );
  }
  
  return null;
}

// AuditTab is now merged into LifecycleTab - keeping stub for backwards compatibility
function AuditTab({ product }: { product: ProductDetail }) {
  const t = useTranslations('admin.products.v2.detail');
  const events = product.recent_audit_events || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4" />
          {t('audit.recentEvents')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {events.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('audit.noEvents')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => {
              const eventMeta = AUDIT_EVENT_META[event.event_type as keyof typeof AUDIT_EVENT_META] || {
                label: event.event_type,
                color: '#6b7280',
              };
              return (
                <div key={event.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-shrink-0 mt-1">
                    <div 
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: eventMeta.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{eventMeta.label}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.actor_email || 'System'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SETTINGS TAB - Lekbanken Product Settings (non-Stripe)
// ============================================================================

function SettingsTab({ product, onRefresh }: { product: ProductDetail; onRefresh: () => void }) {
  const t = useTranslations('admin.products.v2.detail');
  const { success, error: toastError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [customerDescription, setCustomerDescription] = useState(product.customer_description || '');
  const [minSeats, setMinSeats] = useState(product.min_seats || 1);
  const [maxSeats, setMaxSeats] = useState(product.max_seats || 100);
  
  const hasChanges = 
    customerDescription !== (product.customer_description || '') ||
    minSeats !== (product.min_seats || 1) ||
    maxSeats !== (product.max_seats || 100);
  
  const handleSave = useCallback(async () => {
    // Validate min/max seats
    if (minSeats < 1) {
      toastError(t('settings.minSeatsError'));
      return;
    }
    if (maxSeats < minSeats) {
      toastError(t('settings.maxSeatsError'));
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_description: customerDescription || null,
          min_seats: minSeats,
          max_seats: maxSeats,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('settings.saveError'));
      }
      
      success(t('settings.saved'));
      onRefresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('settings.saveSettingsError'));
    } finally {
      setIsLoading(false);
    }
  }, [product.id, customerDescription, minSeats, maxSeats, success, toastError, onRefresh, t]);
  
  const handleReset = useCallback(() => {
    setCustomerDescription(product.customer_description || '');
    setMinSeats(product.min_seats || 1);
    setMaxSeats(product.max_seats || 100);
  }, [product]);
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Produktinställningar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cog6ToothIcon className="h-4 w-4" />
            {t('settings.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Customer Description */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('settings.customerDescription')}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              {t('settings.customerDescriptionHint')}
            </p>
            <textarea
              value={customerDescription}
              onChange={(e) => setCustomerDescription(e.target.value)}
              placeholder={t('settings.customerDescriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none"
              disabled={isLoading}
            />
          </div>
          
          {/* Min/Max Seats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('settings.minSeats')}
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('settings.minSeatsHint')}
              </p>
              <input
                type="number"
                min={1}
                value={minSeats}
                onChange={(e) => setMinSeats(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('settings.maxSeats')}
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                {t('settings.maxSeatsHint')}
              </p>
              <input
                type="number"
                min={1}
                value={maxSeats}
                onChange={(e) => setMaxSeats(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                disabled={isLoading}
              />
            </div>
          </div>
          
          {/* Save Button */}
          <div className="pt-2 flex justify-end gap-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
              >
                {t('settings.reset')}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
            >
              {isLoading ? t('settings.saving') : t('settings.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            {t('settings.aboutSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">{t('settings.customerDescription')}:</strong> {t('settings.aboutCustomerDescription')}
          </p>
          <p>
            <strong className="text-foreground">{t('availability.minSeats')}/{t('availability.maxSeats')}:</strong> {t('settings.aboutSeats')}
          </p>
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs" dangerouslySetInnerHTML={{ __html: t.raw('settings.stripeFieldsNote') }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ProductDetailPageProps = {
  productId: string;
};

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const t = useTranslations('admin.products.v2.detail');
  const router = useRouter();
  const { success, warning, info } = useToast();
  const { activeTab, setActiveTab } = useTabs('overview');

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: ProductCardTab; label: string }> = [
    { id: 'overview', label: t('tabs.overview') },
    { id: 'pricing', label: t('tabs.pricing') },
    { id: 'stripe', label: t('tabs.stripe') },
    { id: 'settings', label: t('tabs.settings') },
    { id: 'availability', label: t('tabs.availability') },
    { id: 'entitlements', label: t('tabs.entitlements') },
    { id: 'lifecycle', label: t('tabs.lifecycle') },
  ];

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/products/${productId}`);
      if (!response.ok) throw new Error('Failed to load product');
      const data = await response.json();
      setProduct(data.product);
    } catch (err) {
      console.error('[ProductDetailPage] Load error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const handleStatusChange = useCallback(async (newStatus: ProductStatus) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      success(t('sync.statusUpdated', { status: PRODUCT_STATUS_META[newStatus].label }));
      await loadProduct();
    } catch {
      warning(t('errors.statusUpdateFailed'));
    }
  }, [productId, success, warning, loadProduct, t]);

  const handleSyncStripe = useCallback(async (force = false) => {
    try {
      const res = await fetch('/api/admin/stripe/sync-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          action: force ? 'force_sync' : 'sync',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      
      if (data.data?.operation === 'skipped') {
        info(t('sync.alreadySynced'));
      } else {
        success(data.data?.operation === 'created' ? t('sync.created') : t('sync.updated'));
      }
      await loadProduct();
    } catch (err) {
      warning(err instanceof Error ? err.message : t('errors.syncFailed'));
    }
  }, [productId, success, warning, info, loadProduct, t]);

  if (isLoading) {
    return (
      <AdminPageLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminPageLayout>
    );
  }

  if (error || !product) {
    return (
      <AdminPageLayout>
        <AdminErrorState
          title={t('errors.loadFailed')}
          description={error || t('errors.notFound')}
          onRetry={() => void loadProduct()}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: '/admin' },
          { label: t('breadcrumbs.products'), href: '/admin/products' },
          { label: product.name },
        ]}
      />

      <AdminPageHeader
        title={product.name}
        description={t('header.productKey', { key: product.product_key || product.id.slice(0, 8) })}
        icon={<CubeIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/products')}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              {t('header.back')}
            </Button>
            {/* TODO: Add edit page/dialog when product editing is implemented */}
            {product.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('active')}>
                <CheckCircleIcon className="mr-2 h-4 w-4" />
                {t('header.activate')}
              </Button>
            )}
            {product.status === 'active' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('archived')}>
                <ArchiveBoxIcon className="mr-2 h-4 w-4" />
                {t('header.archive')}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleSyncStripe(false)}>
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              {t('header.syncStripe')}
            </Button>
            {(product.stripe_linkage?.status === 'drift' || product.stripe_linkage?.status === 'error') && (
              <Button variant="destructive" size="sm" onClick={() => handleSyncStripe(true)}>
                {t('header.forceSync')}
              </Button>
            )}
          </div>
        }
      />

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <StatusBadge status={product.status} />
        <StripeBadge status={product.stripe_linkage.status} />
        <HealthBadge status={product.health_status} issues={product.health_issues} />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
        className="mb-6"
      />

      <TabPanel id="overview" activeTab={activeTab}>
        <OverviewTab product={product} onRefresh={loadProduct} onNavigateToTab={setActiveTab} />
      </TabPanel>

      <TabPanel id="pricing" activeTab={activeTab}>
        <PricingTab product={product} onRefresh={loadProduct} />
      </TabPanel>

      <TabPanel id="stripe" activeTab={activeTab}>
        <StripeTabComponent product={product} onRefresh={loadProduct} />
      </TabPanel>

      <TabPanel id="settings" activeTab={activeTab}>
        <SettingsTab product={product} onRefresh={loadProduct} />
      </TabPanel>

      <TabPanel id="availability" activeTab={activeTab}>
        <AvailabilityTab product={product} />
      </TabPanel>

      <TabPanel id="entitlements" activeTab={activeTab}>
        <EntitlementsTab product={product} />
      </TabPanel>

      <TabPanel id="lifecycle" activeTab={activeTab}>
        <LifecycleTab product={product} onRefresh={loadProduct} />
      </TabPanel>
    </AdminPageLayout>
  );
}
