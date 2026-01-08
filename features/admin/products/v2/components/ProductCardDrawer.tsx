'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  XCircleIcon,
  LinkIcon,
  CurrencyDollarIcon,
  KeyIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DocumentTextIcon,
  TagIcon,
  GlobeAltIcon,
  LockClosedIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
  ProductPrice,
  ProductEntitlement,
  TenantAssignment,
  AuditEvent,
} from '../types';
import {
  PRODUCT_STATUS_META,
  PRODUCT_TYPE_META,
  STRIPE_LINKAGE_META,
  HEALTH_STATUS_META,
  AVAILABILITY_SCOPE_META,
  PRICE_INTERVAL_META,
  AUDIT_EVENT_META,
} from '../types';

// ============================================================================
// HELPER COMPONENTS
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
// TAB: OVERVIEW
// ============================================================================

function OverviewTab({
  product,
  onEdit,
}: {
  product: ProductDetail;
  onEdit: () => void;
}) {
  const typeMeta = PRODUCT_TYPE_META[product.product_type];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Priser" value={product.prices_count} icon={CurrencyDollarIcon} />
        <StatCard label="Entitlements" value={product.entitlements?.length ?? 0} icon={KeyIcon} />
        <StatCard label="Organisationer" value={product.assigned_tenants_count} icon={BuildingOfficeIcon} />
        <StatCard
          label="Senast uppdaterad"
          value={formatDate(product.updated_at)}
          icon={ClockIcon}
        />
      </div>

      {/* Core Info Card */}
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
          <InfoRow label="Kategori">
            {product.category || '—'}
          </InfoRow>
          <InfoRow label="Status">
            <StatusBadge status={product.status} />
          </InfoRow>
          <InfoRow label="Stripe">
            <StripeBadge status={product.stripe_linkage.status} />
          </InfoRow>
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

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Taggar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Edit Button */}
      <Button className="w-full" onClick={onEdit}>
        <PencilSquareIcon className="mr-2 h-4 w-4" />
        Redigera produkt
      </Button>
    </div>
  );
}

// ============================================================================
// TAB: PRICING
// ============================================================================

function PricingTab({ product }: { product: ProductDetail }) {
  const linkage = product.stripe_linkage;

  return (
    <div className="space-y-6">
      {/* Stripe Linkage Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Stripe-koppling
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Status">
            <StripeBadge status={linkage.status} />
          </InfoRow>
          <InfoRow label="Stripe Product ID" copyValue={linkage.stripe_product_id || ''}>
            {linkage.stripe_product_id ? (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                {linkage.stripe_product_id}
              </code>
            ) : (
              <span className="text-muted-foreground">Ej kopplad</span>
            )}
          </InfoRow>
          <InfoRow label="Senast synkad">
            {formatDateTime(linkage.last_synced_at)}
          </InfoRow>
          <InfoRow label="Aktiva priser">
            {linkage.active_prices_count}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Drift Detection */}
      {linkage.status === 'drift' && linkage.drift_details && linkage.drift_details.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Avvikelser mot Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Fält</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Lokalt</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Stripe</th>
                  </tr>
                </thead>
                <tbody>
                  {linkage.drift_details.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2 font-medium">{item.field}</td>
                      <td className="py-2 text-muted-foreground">{item.local_value || '—'}</td>
                      <td className="py-2 text-muted-foreground">{item.stripe_value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prices Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CurrencyDollarIcon className="h-4 w-4" />
            Priser ({product.prices?.length ?? 0})
          </CardTitle>
          <Button variant="outline" size="sm" disabled>
            Lägg till pris
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.prices || product.prices.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <CurrencyDollarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga priser konfigurerade</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Belopp</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Intervall</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Stripe ID</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Åtgärder</th>
                  </tr>
                </thead>
                <tbody>
                  {product.prices.map((price) => (
                    <PriceRow key={price.id} price={price} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Button */}
      <Button variant="outline" className="w-full" disabled>
        <ArrowPathIcon className="mr-2 h-4 w-4" />
        Synkronisera med Stripe
      </Button>
    </div>
  );
}

function PriceRow({ price }: { price: ProductPrice }) {
  const intervalMeta = PRICE_INTERVAL_META[price.interval];

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{formatCurrency(price.amount, price.currency)}</span>
          {price.is_default && (
            <Badge variant="secondary" className="text-xs">Standard</Badge>
          )}
        </div>
      </td>
      <td className="py-2">
        {intervalMeta.label}
      </td>
      <td className="py-2">
        {price.stripe_price_id ? (
          <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
            {price.stripe_price_id.slice(0, 16)}...
          </code>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-2">
        <Badge variant={price.active ? 'default' : 'secondary'}>
          {price.active ? 'Aktiv' : 'Inaktiv'}
        </Badge>
      </td>
      <td className="py-2 text-right">
        <Button variant="ghost" size="sm" disabled>
          Redigera
        </Button>
      </td>
    </tr>
  );
}

// ============================================================================
// TAB: ENTITLEMENTS
// ============================================================================

function EntitlementsTab({ product }: { product: ProductDetail }) {
  return (
    <div className="space-y-6">
      {/* Entitlements List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyIcon className="h-4 w-4" />
            Feature Entitlements ({product.entitlements?.length ?? 0})
          </CardTitle>
          <Button variant="outline" size="sm" disabled>
            Lägg till
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.entitlements || product.entitlements.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <KeyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga entitlements konfigurerade</p>
              <p className="text-xs mt-1">Definiera vilka funktioner denna produkt låser upp</p>
            </div>
          ) : (
            <div className="space-y-2">
              {product.entitlements.map((ent) => (
                <EntitlementRow key={ent.id} entitlement={ent} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependencies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Beroenden
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {(!product.dependencies || product.dependencies.length === 0) ? (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Inga beroenden konfigurerade
            </div>
          ) : (
            <div className="space-y-2">
              {product.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
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

function EntitlementRow({ entitlement }: { entitlement: ProductEntitlement }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${entitlement.enabled ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
        />
        <div>
          <p className="text-sm font-medium">{entitlement.feature_label}</p>
          <p className="text-xs text-muted-foreground font-mono">{entitlement.feature_key}</p>
        </div>
      </div>
      <Badge variant={entitlement.enabled ? 'default' : 'secondary'}>
        {entitlement.enabled ? 'Aktiverad' : 'Inaktiverad'}
      </Badge>
    </div>
  );
}

// ============================================================================
// TAB: AVAILABILITY
// ============================================================================

function AvailabilityTab({ product }: { product: ProductDetail }) {
  const availability = product.availability;
  const scopeMeta = AVAILABILITY_SCOPE_META[availability?.scope ?? 'global'];

  return (
    <div className="space-y-6">
      {/* Scope Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GlobeAltIcon className="h-4 w-4" />
            Tillgänglighetsomfång
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Omfång">
            <Badge variant="outline">{scopeMeta.label}</Badge>
          </InfoRow>
          <InfoRow label="Beskrivning">
            {scopeMeta.description}
          </InfoRow>
          <InfoRow label="Licensmodell">
            {availability?.license_model === 'per_tenant' && 'Per organisation'}
            {availability?.license_model === 'per_seat' && 'Per säte'}
            {availability?.license_model === 'per_user' && 'Per användare'}
            {!availability?.license_model && '—'}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Tenant Assignments */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BuildingOfficeIcon className="h-4 w-4" />
            Organisationstilldelningar ({availability?.total_assigned_tenants ?? 0})
          </CardTitle>
          <Button variant="outline" size="sm" disabled>
            Tilldela
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {(!availability?.tenant_assignments || availability.tenant_assignments.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground">
              <BuildingOfficeIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Inga organisationer tilldelade</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Organisation</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Stripe</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Tilldelad</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.tenant_assignments.map((assignment) => (
                    <TenantRow key={assignment.id} assignment={assignment} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TenantRow({ assignment }: { assignment: TenantAssignment }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2">
        <span className="font-medium">{assignment.tenant_name}</span>
      </td>
      <td className="py-2">
        <Badge
          variant={
            assignment.status === 'active'
              ? 'default'
              : assignment.status === 'pending'
              ? 'secondary'
              : 'destructive'
          }
        >
          {assignment.status === 'active' && 'Aktiv'}
          {assignment.status === 'pending' && 'Väntande'}
          {assignment.status === 'revoked' && 'Återkallad'}
        </Badge>
      </td>
      <td className="py-2">
        {assignment.has_stripe_customer ? (
          <Badge variant="default" className="gap-1">
            <CheckCircleIcon className="h-3 w-3" />
            Kopplad
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircleIcon className="h-3 w-3" />
            Saknas
          </Badge>
        )}
      </td>
      <td className="py-2 text-muted-foreground">
        {formatDate(assignment.assigned_at)}
      </td>
    </tr>
  );
}

// ============================================================================
// TAB: LIFECYCLE
// ============================================================================

function LifecycleTab({ product }: { product: ProductDetail }) {
  const lifecycle = product.lifecycle;
  const checklist = product.publish_checklist;

  return (
    <div className="space-y-6">
      {/* Current State */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            Aktuellt tillstånd
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Status">
            <StatusBadge status={product.status} />
          </InfoRow>
          <InfoRow label="Kan aktiveras">
            {lifecycle?.can_activate ? (
              <Badge variant="default">Ja</Badge>
            ) : (
              <Badge variant="destructive">Nej</Badge>
            )}
          </InfoRow>
          <InfoRow label="Kan arkiveras">
            {lifecycle?.can_archive ? (
              <Badge variant="default">Ja</Badge>
            ) : (
              <Badge variant="destructive">Nej</Badge>
            )}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Activation Blockers */}
      {lifecycle?.activation_blockers && lifecycle.activation_blockers.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <LockClosedIcon className="h-4 w-4" />
              Aktiveringsblockerare
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {lifecycle.activation_blockers.map((blocker, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                <XCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{blocker}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Publish Checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Publicerings-checklista
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <ChecklistItem
            label="Har giltigt pris (om betald)"
            passed={checklist?.has_valid_price ?? false}
          />
          {/* Entitlements check disabled until feature is implemented */}
          {/* <ChecklistItem
            label="Har entitlements-mappning"
            passed={checklist?.has_entitlements ?? false}
          /> */}
          <ChecklistItem
            label="Tillgänglighetsregler giltiga"
            passed={checklist?.availability_rules_valid ?? false}
          />
          <ChecklistItem
            label="Stripe-koppling OK"
            passed={checklist?.stripe_linkage_ok ?? false}
          />
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tidsstämplar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Skapad">
            {formatDateTime(product.created_at)}
          </InfoRow>
          <InfoRow label="Senast uppdaterad">
            {formatDateTime(product.updated_at)}
          </InfoRow>
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

// ============================================================================
// TAB: AUDIT
// ============================================================================

function AuditTab({ product }: { product: ProductDetail }) {
  const events = product.recent_audit_events || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DocumentTextIcon className="h-4 w-4" />
            Senaste händelser
          </CardTitle>
          <Button variant="outline" size="sm" disabled>
            Exportera
          </Button>
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
                <AuditEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const eventMeta = AUDIT_EVENT_META[event.event_type as keyof typeof AUDIT_EVENT_META] || {
    label: event.event_type,
    color: '#6b7280',
  };

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <div className="flex-shrink-0 mt-1">
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
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDateTime(event.created_at || event.timestamp || '')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {event.actor_name || event.actor_email || 'System'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ProductCardDrawerProps = {
  product: ProductDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
};

export function ProductCardDrawer({
  product,
  open,
  onOpenChange,
  onRefresh,
}: ProductCardDrawerProps) {
  const router = useRouter();
  const { success, warning } = useToast();
  const { activeTab, setActiveTab } = useTabs('overview');

  const tabs: Array<{ id: ProductCardTab; label: string }> = [
    { id: 'overview', label: 'Översikt' },
    { id: 'pricing', label: 'Prissättning' },
    { id: 'entitlements', label: 'Entitlements' },
    { id: 'availability', label: 'Tillgänglighet' },
    { id: 'lifecycle', label: 'Livscykel' },
    { id: 'audit', label: 'Logg' },
  ];

  const handleEdit = useCallback(() => {
    if (product) {
      router.push(`/admin/products/${product.id}/edit`);
    }
  }, [product, router]);

  const handleOpenFullPage = useCallback(() => {
    if (product) {
      router.push(`/admin/products/${product.id}`);
    }
  }, [product, router]);

  const handleStatusChange = useCallback(async (newStatus: ProductStatus) => {
    if (!product) return;

    try {
      const res = await fetch(`/api/admin/products/${product.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update status');

      success(`Status uppdaterad till ${PRODUCT_STATUS_META[newStatus].label}`);
      onRefresh?.();
    } catch {
      warning('Kunde inte uppdatera status');
    }
  }, [product, success, warning, onRefresh]);

  const handleSyncStripe = useCallback(async () => {
    if (!product) return;

    try {
      const res = await fetch(`/api/admin/products/${product.id}/sync-stripe`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to sync');

      success('Synkronisering startad');
      onRefresh?.();
    } catch {
      warning('Kunde inte synkronisera');
    }
  }, [product, success, warning, onRefresh]);

  if (!product) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4 border-b border-border">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <CubeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-lg font-semibold truncate">
                  {product.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-xs">
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">
                    {product.product_key || product.id.slice(0, 8)}
                  </code>
                  <CopyButton text={product.id} label="UUID" />
                </SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleOpenFullPage}>
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Status & Health Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={product.status} />
            <StripeBadge status={product.stripe_linkage.status} />
            <HealthBadge status={product.health_status} issues={product.health_issues} />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <PencilSquareIcon className="mr-1.5 h-4 w-4" />
              Redigera
            </Button>
            {product.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('active')}
              >
                <CheckCircleIcon className="mr-1.5 h-4 w-4" />
                Aktivera
              </Button>
            )}
            {product.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('archived')}
              >
                <ArchiveBoxIcon className="mr-1.5 h-4 w-4" />
                Arkivera
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSyncStripe}>
              <ArrowPathIcon className="mr-1.5 h-4 w-4" />
              Synka
            </Button>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-4">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
            className="mb-4"
          />

          <TabPanel id="overview" activeTab={activeTab}>
            <OverviewTab product={product} onEdit={handleEdit} />
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
