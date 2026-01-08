'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CubeIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  XCircleIcon,
  LinkIcon,
  CurrencyDollarIcon,
  KeyIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ArchiveBoxIcon,
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
} from './types';
import {
  PRODUCT_STATUS_META,
  PRODUCT_TYPE_META,
  STRIPE_LINKAGE_META,
  HEALTH_STATUS_META,
  AVAILABILITY_SCOPE_META,
  PRICE_INTERVAL_META,
} from './types';

// ============================================================================
// HELPER COMPONENTS (reused from ProductCardDrawer)
// ============================================================================

function CopyButton({ text, label }: { text: string; label?: string }) {
  const { info } = useToast();

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    info('Kopierat till urklipp');
  }, [text, info]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={`Kopiera ${label || text}`}
    >
      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
      {label && <span>{label}</span>}
    </button>
  );
}

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
        <span className="text-xs text-muted-foreground">({issues.length} problem)</span>
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

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// TAB COMPONENTS (simplified versions)
// ============================================================================

function OverviewTab({ product }: { product: ProductDetail }) {
  const typeMeta = PRODUCT_TYPE_META[product.product_type];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Quick Stats */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Priser" value={product.prices_count} icon={CurrencyDollarIcon} />
          <StatCard label="Entitlements" value={product.entitlements?.length ?? 0} icon={KeyIcon} />
          <StatCard label="Organisationer" value={product.assigned_tenants_count} icon={BuildingOfficeIcon} />
          <StatCard label="Senast uppdaterad" value={formatDate(product.updated_at)} icon={ClockIcon} />
        </div>

        {/* Health Issues */}
        {product.health_issues && product.health_issues.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                Hälsoproblem
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
      </div>

      {/* Core Info Card */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CubeIcon className="h-4 w-4" />
              Grundinformation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label="UUID" copyValue={product.id}>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {product.id.slice(0, 8)}...
              </code>
            </InfoRow>
            <InfoRow label="Produktnyckel" copyValue={product.product_key || ''}>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {product.product_key || '—'}
              </code>
            </InfoRow>
            <InfoRow label="Typ">
              <Badge variant="outline">{typeMeta.label}</Badge>
            </InfoRow>
            <InfoRow label="Kategori">{product.category || '—'}</InfoRow>
            <InfoRow label="Status"><StatusBadge status={product.status} /></InfoRow>
            <InfoRow label="Stripe"><StripeBadge status={product.stripe_linkage.status} /></InfoRow>
          </CardContent>
        </Card>

        {/* Description Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4" />
              Beskrivningar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Intern beskrivning</p>
              <p className="text-sm">{product.internal_description || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Kundbeskrivning</p>
              <p className="text-sm">{product.customer_description || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PricingTab({ product }: { product: ProductDetail }) {
  const linkage = product.stripe_linkage;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Stripe Linkage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Stripe-koppling
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Status"><StripeBadge status={linkage.status} /></InfoRow>
          <InfoRow label="Stripe Product ID" copyValue={linkage.stripe_product_id || ''}>
            {linkage.stripe_product_id ? (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{linkage.stripe_product_id}</code>
            ) : (
              <span className="text-muted-foreground">Ej kopplad</span>
            )}
          </InfoRow>
          <InfoRow label="Senast synkad">{formatDateTime(linkage.last_synced_at)}</InfoRow>
          <InfoRow label="Aktiva priser">{linkage.active_prices_count}</InfoRow>
        </CardContent>
      </Card>

      {/* Prices Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4" />
            Priser ({product.prices?.length ?? 0})
          </CardTitle>
          <Button variant="outline" size="sm" disabled>Lägg till pris</Button>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.prices || product.prices.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <CurrencyDollarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga priser konfigurerade</p>
            </div>
          ) : (
            <div className="space-y-2">
              {product.prices.map((price) => (
                <div key={price.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium">{formatCurrency(price.amount, price.currency)}</span>
                    <span className="text-muted-foreground text-sm ml-2">{PRICE_INTERVAL_META[price.interval].label}</span>
                  </div>
                  <Badge variant={price.active ? 'default' : 'secondary'}>{price.active ? 'Aktiv' : 'Inaktiv'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntitlementsTab({ product }: { product: ProductDetail }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyIcon className="h-4 w-4" />
            Feature Entitlements
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.entitlements || product.entitlements.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <KeyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga entitlements konfigurerade</p>
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
                  <Badge variant={ent.enabled ? 'default' : 'secondary'}>{ent.enabled ? 'Aktiverad' : 'Inaktiverad'}</Badge>
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
            Beroenden
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.dependencies || product.dependencies.length === 0) ? (
            <div className="py-4 text-center text-muted-foreground text-sm">Inga beroenden konfigurerade</div>
          ) : (
            <div className="space-y-2">
              {product.dependencies.map((dep) => (
                <div key={dep.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={dep.dependency_type === 'requires' ? 'default' : 'destructive'}>
                      {dep.dependency_type === 'requires' ? 'Kräver' : 'Utesluter'}
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
  const availability = product.availability;
  const scopeMeta = AVAILABILITY_SCOPE_META[availability?.scope ?? 'global'];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4" />
            Tillgänglighetsomfång
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Omfång"><Badge variant="outline">{scopeMeta.label}</Badge></InfoRow>
          <InfoRow label="Beskrivning">{scopeMeta.description}</InfoRow>
          <InfoRow label="Licensmodell">
            {availability?.license_model === 'per_tenant' && 'Per organisation'}
            {availability?.license_model === 'per_seat' && 'Per säte'}
            {availability?.license_model === 'per_user' && 'Per användare'}
            {!availability?.license_model && '—'}
          </InfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4" />
            Organisationstilldelningar
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(!availability?.tenant_assignments || availability.tenant_assignments.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <BuildingOfficeIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga organisationer tilldelade</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availability.tenant_assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="font-medium">{assignment.tenant_name}</span>
                  <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                    {assignment.status === 'active' ? 'Aktiv' : 'Väntande'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LifecycleTab({ product }: { product: ProductDetail }) {
  const lifecycle = product.lifecycle;
  const checklist = product.publish_checklist;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Aktuellt tillstånd
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Status"><StatusBadge status={product.status} /></InfoRow>
          <InfoRow label="Kan aktiveras">
            {lifecycle?.can_activate ? <Badge variant="default">Ja</Badge> : <Badge variant="destructive">Nej</Badge>}
          </InfoRow>
          <InfoRow label="Kan arkiveras">
            {lifecycle?.can_archive ? <Badge variant="default">Ja</Badge> : <Badge variant="destructive">Nej</Badge>}
          </InfoRow>
          <InfoRow label="Skapad">{formatDateTime(product.created_at)}</InfoRow>
          <InfoRow label="Uppdaterad">{formatDateTime(product.updated_at)}</InfoRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Publicerings-checklista
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <ChecklistItem label="Har giltigt pris" passed={checklist?.has_valid_price ?? false} />
          <ChecklistItem label="Har entitlements" passed={checklist?.has_entitlements ?? false} />
          <ChecklistItem label="Tillgänglighetsregler OK" passed={checklist?.availability_rules_valid ?? false} />
          <ChecklistItem label="Stripe-koppling OK" passed={checklist?.stripe_linkage_ok ?? false} />
        </CardContent>
      </Card>
    </div>
  );
}

function ChecklistItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {passed ? <CheckCircleIcon className="h-4 w-4 text-emerald-500" /> : <XCircleIcon className="h-4 w-4 text-muted-foreground" />}
      <span className={`text-sm ${passed ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  );
}

function AuditTab({ product }: { product: ProductDetail }) {
  const events = product.recent_audit_events || [];
  const eventLabels: Record<string, string> = {
    created: 'Skapad', updated: 'Uppdaterad', status_changed: 'Status ändrad',
    price_added: 'Pris tillagt', archived: 'Arkiverad', restored: 'Återställd',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4" />
          Senaste händelser
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {events.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <DocumentTextIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Inga loggade händelser</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-shrink-0 mt-1"><div className="h-2 w-2 rounded-full bg-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{eventLabels[event.event_type] || event.event_type}</p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.actor_name || event.actor_email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ProductDetailPageProps = {
  productId: string;
};

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const router = useRouter();
  const { success, warning } = useToast();
  const { activeTab, setActiveTab } = useTabs('overview');

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: Array<{ id: ProductCardTab; label: string }> = [
    { id: 'overview', label: 'Översikt' },
    { id: 'pricing', label: 'Prissättning' },
    { id: 'entitlements', label: 'Entitlements' },
    { id: 'availability', label: 'Tillgänglighet' },
    { id: 'lifecycle', label: 'Livscykel' },
    { id: 'audit', label: 'Logg' },
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
      success(`Status uppdaterad till ${PRODUCT_STATUS_META[newStatus].label}`);
      await loadProduct();
    } catch {
      warning('Kunde inte uppdatera status');
    }
  }, [productId, success, warning, loadProduct]);

  const handleSyncStripe = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/sync-stripe`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to sync');
      success('Synkronisering startad');
      await loadProduct();
    } catch {
      warning('Kunde inte synkronisera');
    }
  }, [productId, success, warning, loadProduct]);

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
          title="Kunde inte ladda produkt"
          description={error || 'Produkten hittades inte'}
          onRetry={() => void loadProduct()}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Startsida', href: '/admin' },
          { label: 'Produkter', href: '/admin/products' },
          { label: product.name },
        ]}
      />

      <AdminPageHeader
        title={product.name}
        description={`Produktnyckel: ${product.product_key || product.id.slice(0, 8)}`}
        icon={<CubeIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/products')}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Tillbaka
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/admin/products/${product.id}/edit`)}>
              <PencilSquareIcon className="mr-2 h-4 w-4" />
              Redigera
            </Button>
            {product.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('active')}>
                <CheckCircleIcon className="mr-2 h-4 w-4" />
                Aktivera
              </Button>
            )}
            {product.status === 'active' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('archived')}>
                <ArchiveBoxIcon className="mr-2 h-4 w-4" />
                Arkivera
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSyncStripe}>
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Synka Stripe
            </Button>
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
        <OverviewTab product={product} />
      </TabPanel>

      <TabPanel id="pricing" activeTab={activeTab}>
        <PricingTab product={product} />
      </TabPanel>

      <TabPanel id="entitlements" activeTab={activeTab}>
        <EntitlementsTab product={product} />
      </TabPanel>

      <TabPanel id="availability" activeTab={activeTab}>
        <AvailabilityTab product={product} />
      </TabPanel>

      <TabPanel id="lifecycle" activeTab={activeTab}>
        <LifecycleTab product={product} />
      </TabPanel>

      <TabPanel id="audit" activeTab={activeTab}>
        <AuditTab product={product} />
      </TabPanel>
    </AdminPageLayout>
  );
}
