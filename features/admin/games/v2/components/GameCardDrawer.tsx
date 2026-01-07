'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  UserGroupIcon,
  XCircleIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  TagIcon,
  CalendarIcon,
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
import type {
  GameAdminRow,
  GameCardTab,
  ValidationState,
  PlayMode,
} from '../types';
import { PLAY_MODE_META } from '../types';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ValidationBadge({ state, className }: { state: ValidationState; className?: string }) {
  const config = {
    valid: { icon: CheckCircleIcon, label: 'Godkänd', variant: 'success' as const },
    warnings: { icon: ExclamationTriangleIcon, label: 'Varningar', variant: 'warning' as const },
    errors: { icon: XCircleIcon, label: 'Fel', variant: 'destructive' as const },
    pending: { icon: ClockIcon, label: 'Väntar', variant: 'secondary' as const },
    outdated: { icon: InformationCircleIcon, label: 'Inaktuell', variant: 'outline' as const },
  };

  const { icon: Icon, label, variant } = config[state] || config.pending;

  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'published' ? 'success' : 'secondary';
  const label = status === 'published' ? 'Publicerad' : 'Utkast';
  return <Badge variant={variant}>{label}</Badge>;
}

function PlayModeBadge({ mode }: { mode: PlayMode | null }) {
  if (!mode) return null;
  const meta = PLAY_MODE_META[mode];
  return (
    <Badge variant="outline" style={{ borderColor: meta.color, color: meta.color }}>
      {meta.labelShort}
    </Badge>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{children}</span>
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
// TAB COMPONENTS
// ============================================================================

function OverviewTab({ game, onOpenBuilder }: { game: GameAdminRow; onOpenBuilder: () => void }) {
  const coverMedia = game.media?.find(m => m.kind === 'cover');
  const coverUrl = coverMedia?.media?.url;

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      {coverUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={game.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Steg" value={game.step_count ?? 0} />
        <StatCard label="Faser" value={game.phase_count ?? 0} />
        <StatCard label="Roller" value={game.role_count ?? 0} />
        <StatCard label="Tid (min)" value={game.time_estimate_min ?? '—'} icon={ClockIcon} />
      </div>

      {/* Core Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Grundinformation</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Status">
            <StatusBadge status={game.status} />
          </InfoRow>
          <InfoRow label="Spelläge">
            <PlayModeBadge mode={game.play_mode} />
          </InfoRow>
          <InfoRow label="Validering">
            <ValidationBadge state={game.validation_state ?? 'pending'} />
          </InfoRow>
          <InfoRow label="Huvudsyfte">
            {game.main_purpose?.name || '—'}
          </InfoRow>
          <InfoRow label="Ägare">
            {game.owner?.name || 'Global'}
          </InfoRow>
          <InfoRow label="UUID">
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{game.id.slice(0, 8)}...</code>
          </InfoRow>
        </CardContent>
      </Card>

      {/* Validation Issues */}
      {(game.validation_errors?.length || game.validation_warnings?.length) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-warning" />
              Valideringsproblem
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {game.validation_errors?.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                <XCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
            {game.validation_warnings?.map((warn, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-warning">
                <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{warn}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Open Builder Button */}
      <Button className="w-full" onClick={onOpenBuilder}>
        <PencilSquareIcon className="mr-2 h-4 w-4" />
        Öppna i Game Builder
      </Button>
    </div>
  );
}

function ContentTab({ game }: { game: GameAdminRow }) {
  const playMode = game.play_mode || 'basic';
  const meta = PLAY_MODE_META[playMode];
  const features = meta.features;

  const featureStatus = {
    steps: { label: 'Steg', count: game.step_count ?? 0, required: true },
    materials: { label: 'Material', count: 0, required: false },
    phases: { label: 'Faser', count: game.phase_count ?? 0, required: playMode !== 'basic' },
    timer: { label: 'Timer', count: 0, required: false },
    roles: { label: 'Roller', count: game.role_count ?? 0, required: playMode === 'participants' },
    artifacts: { label: 'Artifacts', count: game.artifact_count ?? 0, required: false },
    triggers: { label: 'Triggers', count: game.trigger_count ?? 0, required: false },
    board: { label: 'Tavla', count: 0, required: false },
  };

  return (
    <div className="space-y-6">
      {/* Play Mode Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Spelläge: {meta.label}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4">{meta.description}</p>
          <div className="grid grid-cols-2 gap-2">
            {features.map((feature) => {
              const status = featureStatus[feature as keyof typeof featureStatus];
              if (!status) return null;
              const hasContent = status.count > 0;
              return (
                <div
                  key={feature}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    hasContent ? 'border-success/50 bg-success/5' : 
                    status.required ? 'border-warning/50 bg-warning/5' : 'border-border'
                  }`}
                >
                  <span className="text-sm">{status.label}</span>
                  <span className="text-sm font-medium">
                    {status.count > 0 ? status.count : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content Version */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Schema & Version</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Content version">
            <Badge variant="outline">{game.game_content_version || 'v1'}</Badge>
          </InfoRow>
          <InfoRow label="Schema status">
            <Badge variant="success">Aktuellt</Badge>
          </InfoRow>
        </CardContent>
      </Card>

      {/* Warnings */}
      {game.validation_warnings && game.validation_warnings.length > 0 && (
        <Card className="border-warning/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning">Innehållsvarningar</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-1">
              {game.validation_warnings.map((w, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AvailabilityTab({ game }: { game: GameAdminRow }) {
  const isGlobal = !game.owner_tenant_id;

  return (
    <div className="space-y-6">
      {/* Scope */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Tillgänglighet</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-3 py-4">
            {isGlobal ? (
              <>
                <GlobeAltIcon className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">Global</p>
                  <p className="text-sm text-muted-foreground">
                    Tillgänglig för alla tenants
                  </p>
                </div>
              </>
            ) : (
              <>
                <BuildingOfficeIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Tenant-specifik</p>
                  <p className="text-sm text-muted-foreground">
                    {game.owner?.name || 'Okänd tenant'}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Association */}
      {game.product && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Produktkoppling</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label="Produkt">
              {game.product.name}
            </InfoRow>
          </CardContent>
        </Card>
      )}

      {/* Admin Controls Placeholder */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Admin-kontroller
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Tenant-tilldelning och licenshantering kommer snart.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MetadataTab({ game }: { game: GameAdminRow }) {
  const purposes = [
    game.main_purpose,
    ...(game.secondary_purposes?.map(sp => sp.purpose) || []),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Basic Metadata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Spelparametrar</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Spelare">
            <div className="flex items-center gap-1">
              <UserGroupIcon className="h-4 w-4" />
              {game.min_players || '?'} – {game.max_players || '?'}
            </div>
          </InfoRow>
          <InfoRow label="Ålder">
            {game.age_min || '?'} – {game.age_max || '?'} år
          </InfoRow>
          <InfoRow label="Tid">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {game.time_estimate_min || '?'} min
            </div>
          </InfoRow>
          <InfoRow label="Energinivå">
            <Badge variant="outline" className="capitalize">
              {game.energy_level || '—'}
            </Badge>
          </InfoRow>
          <InfoRow label="Plats">
            <Badge variant="outline" className="capitalize">
              {game.location_type || '—'}
            </Badge>
          </InfoRow>
        </CardContent>
      </Card>

      {/* Purposes / Tags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Syften
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {purposes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {purposes.map((p, i) => (
                <Badge key={i} variant="secondary">
                  {p?.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Inga syften kopplade</p>
          )}
        </CardContent>
      </Card>

      {/* Category */}
      {game.category && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kategori</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Badge variant="outline">{game.category}</Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HistoryTab({ game }: { game: GameAdminRow }) {
  return (
    <div className="space-y-6">
      {/* Timestamps */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Tidsstämplar
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <InfoRow label="Skapad">
            {new Date(game.created_at).toLocaleDateString('sv-SE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </InfoRow>
          <InfoRow label="Senast uppdaterad">
            {new Date(game.updated_at).toLocaleDateString('sv-SE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Import Source */}
      {game.import_source && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Importkälla</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow label="Typ">
              <Badge variant="outline" className="uppercase">
                {game.import_source.type}
              </Badge>
            </InfoRow>
            <InfoRow label="Importerad">
              {new Date(game.import_source.importedAt).toLocaleDateString('sv-SE')}
            </InfoRow>
            {game.import_source.schemaVersion && (
              <InfoRow label="Schema">
                {game.import_source.schemaVersion}
              </InfoRow>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Timeline Placeholder */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Ändringshistorik
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Detaljerad ändringshistorik kommer i framtida version.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type GameCardDrawerProps = {
  game: GameAdminRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TABS: Array<{ id: GameCardTab; label: string }> = [
  { id: 'overview', label: 'Översikt' },
  { id: 'content', label: 'Innehåll' },
  { id: 'availability', label: 'Tillgänglighet' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'history', label: 'Historik' },
];

export function GameCardDrawer({ game, open, onOpenChange }: GameCardDrawerProps) {
  const router = useRouter();
  const { activeTab, setActiveTab } = useTabs('overview');

  // Reset tab when game changes
  useEffect(() => {
    if (game) {
      setActiveTab('overview');
    }
  }, [game, setActiveTab]);

  const handleOpenBuilder = useCallback(() => {
    if (game) {
      router.push(`/admin/games/${game.id}/edit`);
    }
  }, [game, router]);

  if (!game) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold truncate">
                {game.name}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <StatusBadge status={game.status} />
                <PlayModeBadge mode={game.play_mode} />
                <ValidationBadge state={game.validation_state ?? 'pending'} />
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBuilder}
              className="flex-shrink-0"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-4"
        />

        {/* Tab Panels */}
        <TabPanel id="overview" activeTab={activeTab}>
          <OverviewTab game={game} onOpenBuilder={handleOpenBuilder} />
        </TabPanel>

        <TabPanel id="content" activeTab={activeTab}>
          <ContentTab game={game} />
        </TabPanel>

        <TabPanel id="availability" activeTab={activeTab}>
          <AvailabilityTab game={game} />
        </TabPanel>

        <TabPanel id="metadata" activeTab={activeTab}>
          <MetadataTab game={game} />
        </TabPanel>

        <TabPanel id="history" activeTab={activeTab}>
          <HistoryTab game={game} />
        </TabPanel>
      </SheetContent>
    </Sheet>
  );
}
