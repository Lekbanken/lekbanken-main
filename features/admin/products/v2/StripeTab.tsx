'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { formatDateTime } from '@/lib/i18n/format-utils';
import {
  ArrowPathIcon,
  LinkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui';
import { CopyButton } from '@/components/ui/copy-button';
import {
  FieldLabel,
  ReadOnlyField,
  InfoBox,
  DiffView,
  type DiffItem,
} from '@/components/admin/shared';
import {
  UNIT_LABELS,
  FEATURE_TIERS,
  type UnitLabelType,
  type FeatureTierType,
} from '@/lib/constants/billing';
import type { ProductDetail } from './types';

// =============================================================================
// TYPES
// =============================================================================

interface StripeTabProps {
  product: ProductDetail;
  onRefresh: () => void;
}

// =============================================================================
// STRIPE TAB COMPONENT
// =============================================================================

/**
 * StripeTab - Manages Stripe synchronization and related fields
 * 
 * This tab contains all fields that sync to Stripe, separated from
 * Lekbanken-specific product fields.
 */
export function StripeTab({ product, onRefresh }: StripeTabProps) {
  const t = useTranslations('admin.products.v2.stripeTab');
  const { success, error: toastError, warning } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state for Stripe-synced fields
  const [imageUrl, setImageUrl] = useState(product.image_url || '');
  const [unitLabel, setUnitLabel] = useState<UnitLabelType>(product.unit_label || 'seat');
  const [statementDescriptor, setStatementDescriptor] = useState(product.statement_descriptor || '');
  const [featureTier, setFeatureTier] = useState<FeatureTierType>(product.feature_tier || 'standard');

  // Check for unsaved changes
  const hasChanges =
    imageUrl !== (product.image_url || '') ||
    unitLabel !== (product.unit_label || 'seat') ||
    statementDescriptor !== (product.statement_descriptor || '') ||
    featureTier !== (product.feature_tier || 'standard');

  // Sync status helpers
  const syncStatus = product.stripe_linkage?.status || 'missing';
  const hasDrift = syncStatus === 'drift';
  const lastSynced = product.stripe_linkage?.last_synced_at;

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleSaveLocal = useCallback(async () => {
    if (statementDescriptor.length > 22) {
      toastError(t('messages.statementDescriptorTooLong'));
      return;
    }

    if (imageUrl && !imageUrl.startsWith('https://')) {
      toastError(t('messages.imageUrlMustBeHttps'));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl || null,
          unit_label: unitLabel,
          statement_descriptor: statementDescriptor || null,
          feature_tier: featureTier,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('messages.couldNotSave'));
      }

      success(t('messages.savedLocally'));
      warning(t('messages.rememberToSync'));
      onRefresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.couldNotSave'));
    } finally {
      setIsSaving(false);
    }
  }, [product.id, imageUrl, unitLabel, statementDescriptor, featureTier, success, warning, toastError, onRefresh, t]);

  const handleSyncStripe = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/sync-stripe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('messages.syncFailed'));
      }

      success(t('messages.syncSuccess'));
      onRefresh();
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('messages.couldNotSync'));
    } finally {
      setIsSyncing(false);
    }
  }, [product.id, success, toastError, onRefresh, t]);

  const handleReset = useCallback(() => {
    setImageUrl(product.image_url || '');
    setUnitLabel(product.unit_label || 'seat');
    setStatementDescriptor(product.statement_descriptor || '');
    setFeatureTier(product.feature_tier || 'standard');
  }, [product]);

  // ==========================================================================
  // DRIFT DETECTION
  // ==========================================================================

  const driftItems: DiffItem[] = product.stripe_linkage?.drift_details?.map(d => ({
    field: d.field,
    label: d.field, // Could map to friendly names
    localValue: d.local_value,
    remoteValue: d.stripe_value,
  })) || [];

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Sync Status Banner */}
      <SyncStatusBanner
        syncStatus={syncStatus}
        stripeProductId={product.stripe_product_id}
        lastSynced={lastSynced}
        onSync={handleSyncStripe}
        isSyncing={isSyncing}
      />

      {/* Drift Warning */}
      {hasDrift && driftItems.length > 0 && (
        <DiffView
          diffs={driftItems}
          onUseLocal={handleSyncStripe}
          isLoading={isSyncing}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Synced Fields Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CloudArrowUpIcon className="h-4 w-4" />
              {t('title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Product Image */}
            <div>
              <FieldLabel
                label={t('fields.productImage')}
                fieldName="image_url"
                description={t('fields.productImageDescription')}
              />
              <div className="flex gap-2 mt-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="flex-1 px-3 py-2 border border-input rounded-md bg-background text-sm"
                  disabled={isSaving}
                />
                {imageUrl && (
                  <div className="w-10 h-10 rounded border border-input overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={t('fields.productImageAlt')}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Unit Label */}
            <div>
              <FieldLabel
                label={t('fields.unitLabel')}
                fieldName="unit_label"
                description={t('fields.unitLabelDescription', { unit: unitLabel })}
                required
              />
              <select
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value as UnitLabelType)}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-sm"
                disabled={isSaving}
              >
                {UNIT_LABELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Statement Descriptor */}
            <div>
              <FieldLabel
                label={t('fields.statementDescriptor')}
                fieldName="statement_descriptor"
                description={t('fields.statementDescriptorDescription')}
              />
              <input
                type="text"
                value={statementDescriptor}
                onChange={(e) => setStatementDescriptor(e.target.value.slice(0, 22).toUpperCase())}
                placeholder={t('fields.statementDescriptorPlaceholder')}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-sm font-mono"
                maxLength={22}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {t('fields.statementDescriptorCount', { count: statementDescriptor.length })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metadata Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {t('metadataTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Feature Tier */}
            <div>
              <FieldLabel
                label={t('fields.featureTier')}
                fieldName="feature_tier"
                description={t('fields.featureTierDescription')}
              />
              <select
                value={featureTier}
                onChange={(e) => setFeatureTier(e.target.value as FeatureTierType)}
                className="w-full mt-2 px-3 py-2 border border-input rounded-md bg-background text-sm"
                disabled={isSaving}
              >
                {FEATURE_TIERS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Read-only Stripe Info */}
            <div className="pt-4 border-t border-border space-y-3">
              <ReadOnlyField
                label={t('fields.stripeProductId')}
                value={product.stripe_product_id}
                copyable
                mono
              />
              <ReadOnlyField
                label={t('fields.lastSynced')}
                value={lastSynced ? formatDateTime(lastSynced) : null}
                placeholder={t('fields.neverSynced')}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <InfoBox variant="info" className="flex-1">
              <span dangerouslySetInnerHTML={{ __html: t.raw('actions.info') }} />
            </InfoBox>

            <div className="flex gap-2">
              {hasChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving || isSyncing}
                >
                  {t('actions.reset')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveLocal}
                disabled={isSaving || isSyncing || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <ArrowPathIcon className="mr-1 h-4 w-4 animate-spin" />
                    {t('actions.saving')}
                  </>
                ) : (
                  t('actions.saveLocal')
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleSyncStripe}
                disabled={isSaving || isSyncing}
              >
                {isSyncing ? (
                  <>
                    <ArrowPathIcon className="mr-1 h-4 w-4 animate-spin" />
                    {t('actions.syncing')}
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="mr-1 h-4 w-4" />
                    {t('actions.syncToStripe')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// SYNC STATUS BANNER
// =============================================================================

interface SyncStatusBannerProps {
  syncStatus: string;
  stripeProductId: string | null;
  lastSynced: string | null;
  onSync: () => void;
  isSyncing: boolean;
}

function SyncStatusBanner({
  syncStatus,
  stripeProductId,
  lastSynced,
  onSync,
  isSyncing,
}: SyncStatusBannerProps) {
  const t = useTranslations('admin.products.v2.stripeTab');
  const isConnected = syncStatus === 'connected';
  const hasError = syncStatus === 'error' || syncStatus === 'locked';
  const hasDrift = syncStatus === 'drift';
  const isUnsynced = syncStatus === 'missing' || !stripeProductId;

  let bgClass = 'bg-muted/50';
  let Icon = LinkIcon;
  let statusText = t('status.notConnected');

  if (isConnected) {
    bgClass = 'bg-green-50 dark:bg-green-950';
    Icon = CheckCircleIcon;
    statusText = t('status.synced');
  } else if (hasError) {
    bgClass = 'bg-red-50 dark:bg-red-950';
    Icon = ExclamationTriangleIcon;
    statusText = syncStatus === 'locked' ? t('status.syncLocked') : t('status.syncError');
  } else if (hasDrift) {
    bgClass = 'bg-amber-50 dark:bg-amber-950';
    Icon = ExclamationTriangleIcon;
    statusText = t('status.unsyncedChanges');
  }

  return (
    <div className={`p-4 rounded-lg ${bgClass}`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${isConnected ? 'text-green-600' : hasError ? 'text-red-600' : hasDrift ? 'text-amber-600' : 'text-muted-foreground'}`} />
          <div>
            <p className="font-medium">{statusText}</p>
            {stripeProductId && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{stripeProductId}</span>
                <CopyButton text={stripeProductId} size="sm" />
              </div>
            )}
          </div>
        </div>

        {lastSynced && (
          <span className="text-xs text-muted-foreground">
            {t('status.lastSynced', { date: formatDateTime(lastSynced) })}
          </span>
        )}

        {isUnsynced && (
          <Button size="sm" onClick={onSync} disabled={isSyncing}>
            {isSyncing ? t('status.creating') : t('status.createInStripe')}
          </Button>
        )}
      </div>
    </div>
  );
}
