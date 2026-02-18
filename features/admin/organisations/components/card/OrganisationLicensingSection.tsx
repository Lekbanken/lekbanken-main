'use client';

import { useEffect, useMemo, useState } from 'react';
import { KeyIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { AdminCard, AdminEmptyState, AdminErrorState } from '@/components/admin/shared';
import { Badge, Button, Input } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { supabase } from '@/lib/supabase/client';
import { loadLicensingData } from '../../organisationSections.server';
import type { ProductRow, EntitlementRow } from '../../organisationSections.server';

type Props = {
  tenantId: string;
};

export function OrganisationLicensingSection({ tenantId }: Props) {
  const t = useTranslations('admin.organisations.licensing');
  const { success, warning } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);

  const [productId, setProductId] = useState<string>('');
  const [seats, setSeats] = useState<number>(25);
  const [validTo, setValidTo] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const load = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadLicensingData(tenantId);

      if (result.error) {
        setError(`${t('errorDescription')} (${result.error})`);
        return;
      }

      setProducts(result.products);
      if (!productId && result.products.length > 0) setProductId(result.products[0].id);
      setEntitlements(result.entitlements);
    } catch (err) {
      console.error(err);
      const details = err instanceof Error ? err.message : String(err);
      setError(`${t('errorDescription')} (${details})`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const productsSorted = useMemo(() => {
    return [...products].sort((a, b) => {
      const an = (a.name ?? a.product_key ?? '').toLowerCase();
      const bn = (b.name ?? b.product_key ?? '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [products]);

  const handleGrant = async () => {
    if (!productId) {
      warning(t('toasts.selectProduct'));
      return;
    }

    const quantity = Number.isFinite(seats) ? Math.max(1, Math.floor(seats)) : 1;

    try {
      const { data: authData } = await supabase.auth.getUser();
      const createdBy = authData.user?.id ?? null;

      const { error: insertError } = await supabase.from('tenant_product_entitlements').insert({
        tenant_id: tenantId,
        product_id: productId,
        status: 'active',
        source: 'admin_grant',
        quantity_seats: quantity,
        valid_from: new Date().toISOString(),
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        metadata: reason ? { reason } : {},
        created_by: createdBy,
      });

      if (insertError) throw insertError;

      success(t('toasts.entitlementCreated'));
      setReason('');
      setValidTo('');
      await load();
    } catch (err) {
      console.error(err);
      warning(t('toasts.createFailed'));
    }
  };

  const handleRevoke = async (entitlementId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('tenant_product_entitlements')
        .update({ status: 'revoked', valid_to: new Date().toISOString() })
        .eq('id', entitlementId);

      if (updateError) throw updateError;

      success(t('toasts.entitlementRevoked'));
      await load();
    } catch (err) {
      console.error(err);
      warning(t('toasts.revokeFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <AdminErrorState
          title={t('errorTitle')}
          description={error}
          onRetry={() => void load()}
        />
      )}

      <AdminCard
        title={t('grantCard.title')}
        description={t('grantCard.description')}
        icon={<PlusIcon className="h-5 w-5 text-primary" />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">{t('labels.product')}</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={isLoading || productsSorted.length === 0}
            >
              {isLoading ? (
                <option value="">{t('loading')}</option>
              ) : productsSorted.length === 0 ? (
                <option value="">{t('noProducts')}</option>
              ) : (
                productsSorted.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name ?? p.product_key ?? p.id}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">{t('labels.seats')}</span>
            <Input
              type="number"
              min={1}
              value={String(seats)}
              onChange={(e) => setSeats(Number(e.target.value))}
              disabled={isLoading}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">{t('labels.validToOptional')}</span>
            <Input
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              disabled={isLoading}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">{t('labels.reasonOptional')}</span>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('placeholders.reason')}
              disabled={isLoading}
            />
          </label>
        </div>

        <div className="mt-4">
          <Button onClick={() => void handleGrant()} disabled={isLoading || productsSorted.length === 0}>
            {t('actions.createEntitlement')}
          </Button>
        </div>
      </AdminCard>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : entitlements.length === 0 ? (
        <AdminEmptyState
          icon={<KeyIcon className="h-6 w-6" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {entitlements.map((e) => (
            <AdminCard
              key={e.id}
              title={e.product?.name ?? e.product?.product_key ?? t('unknownProduct')}
              description={`${t('labels.source')}: ${e.source} • ${t('labels.created')}: ${new Date(e.created_at).toLocaleDateString()}`}
              icon={<KeyIcon className="h-5 w-5 text-primary" />}
              actions={
                <div className="flex items-center gap-2">
                  <Badge variant={e.status === 'active' ? 'default' : 'outline'} className="capitalize">
                    {e.status}
                  </Badge>
                  <Badge variant="outline">{t('labels.seatsUsed', { count: e.quantity_seats })}</Badge>
                </div>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {t('labels.validFrom', { date: new Date(e.valid_from).toLocaleDateString() })}
                  {e.valid_to ? `–${new Date(e.valid_to).toLocaleDateString()}` : ''}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRevoke(e.id)}
                  disabled={e.status !== 'active'}
                >
                  {t('actions.revoke')}
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
