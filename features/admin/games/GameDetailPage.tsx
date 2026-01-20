'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AdminBreadcrumbs,
  AdminConfirmDialog,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/shared';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, useToast } from '@/components/ui';
import { useRbac } from '@/features/admin/shared/hooks/useRbac';
import type { Database } from '@/types/supabase';
import { GameFormDialog } from './components/GameFormDialog';
import type { GameFormValues, GameWithRelations, SelectOption } from './types';

type GameDetailPageProps = {
  gameId: string;
};

function toPayload(values: GameFormValues) {
  return {
    name: values.name.trim(),
    short_description: values.short_description.trim(),
    description: values.description || null,
    main_purpose_id: values.main_purpose_id,
    product_id: values.product_id,
    owner_tenant_id: values.owner_tenant_id,
    category: values.category,
    energy_level: values.energy_level,
    location_type: values.location_type,
    time_estimate_min: values.time_estimate_min,
    min_players: values.min_players,
    max_players: values.max_players,
    age_min: values.age_min,
    age_max: values.age_max,
    status: values.status,
  };
}

export function GameDetailPage({ gameId }: GameDetailPageProps) {
  const { can } = useRbac();
  const { success, warning, info } = useToast();
  const router = useRouter();
  const t = useTranslations('admin.games');

  const [game, setGame] = useState<GameWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<SelectOption[]>([]);
  const [purposes, setPurposes] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canView = can('admin.games.list');
  const canEdit = can('admin.games.edit');

  const load = useCallback(async () => {
    if (!canView) return;
    setIsLoading(true);
    setError(null);
    try {
      const [gameRes, tenantsRes, purposesRes, productsRes] = await Promise.all([
        fetch(`/api/games/${gameId}`),
        fetch('/api/tenants'),
        fetch('/api/purposes'),
        fetch('/api/products'),
      ]);

      if (!gameRes.ok) {
        const json = await gameRes.json().catch(() => ({}));
        setError(json.error || t('errors.fetchFailed'));
        return;
      }

      const { game: gameData } = (await gameRes.json()) as { game: GameWithRelations };
      if (!gameData) {
        setError(t('detail.gameMissing'));
        return;
      }

      const tenantsJson = tenantsRes.ok
        ? ((await tenantsRes.json()) as { tenants?: { id: string; name: string | null }[] })
        : { tenants: [] };
      const purposesJson = purposesRes.ok
        ? ((await purposesRes.json()) as { purposes?: { id: string; name: string | null }[] })
        : { purposes: [] };
      const productsJson = productsRes.ok
        ? ((await productsRes.json()) as { products?: { id: string; name: string | null }[] })
        : { products: [] };

      setGame(gameData);
      setTenants((tenantsJson.tenants || []).map((tenant) => ({ value: tenant.id, label: tenant.name || t('labels.nameMissing') })));
      setPurposes((purposesJson.purposes || []).map((p) => ({ value: p.id, label: p.name || t('labels.unknownPurpose') })));
      setProducts((productsJson.products || []).map((p) => ({ value: p.id, label: p.name || t('labels.unknownProduct') })));
    } catch (err) {
      console.error('[admin/games/:id] load error', err);
      setGame(null);
      setError(t('errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [canView, gameId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdate = async (values: GameFormValues) => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPayload(values)),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || t('errors.updateFailed'));
    }
    const { game: updated } = (await res.json()) as { game: GameWithRelations };
    const owner = tenants.find((t) => t.value === updated.owner_tenant_id);
    const purpose = purposes.find((p) => p.value === updated.main_purpose_id);
    const product = products.find((p) => p.value === updated.product_id);
    setGame({
      ...updated,
      owner: owner ? { id: owner.value, name: owner.label } : null,
      main_purpose: purpose ? { id: purpose.value, name: purpose.label } : null,
      product: product ? { id: product.value, name: product.label } : null,
    });
    success(t('messages.changesSaved'));
  };

  const handlePublishToggle = async (next: Database['public']['Enums']['game_status_enum']) => {
    if (!game) return;
    if (next === 'published') {
      const res = await fetch(`/api/games/${game.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCoverImage: true, force: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        warning(json.error || t('errors.publishFailed'));
        return;
      }
    } else {
      const res = await fetch(`/api/games/${game.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        warning(json.error || t('errors.draftFailed'));
        return;
      }
    }
    setGame((prev) => (prev ? { ...prev, status: next } : prev));
    info(next === 'published' ? t('messages.published') : t('messages.restoredToDraft'));
  };

  const handleDelete = async () => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      warning(json.error || t('errors.deleteFailed'));
      return;
    }
    warning(t('messages.gameDeleted'));
    router.push('/admin/games');
  };

  const meta = useMemo(() => {
    if (!game) return [];
    return [
      { label: t('detail.status'), value: game.status === 'published' ? t('detail.published') : t('detail.draft') },
      { label: t('detail.category'), value: game.category || t('detail.notSet') },
      { label: t('detail.energy'), value: game.energy_level || t('detail.notSet') },
      { label: t('detail.purpose'), value: game.main_purpose?.name || t('detail.notSet') },
      { label: t('detail.product'), value: game.product?.name || t('detail.notSet') },
      { label: t('detail.owner'), value: game.owner?.name || t('detail.global') },
      {
        label: t('detail.players'),
        value: `${game.min_players ?? '?'} - ${game.max_players ?? '?'}`,
      },
      { label: t('detail.time'), value: game.time_estimate_min ? `${game.time_estimate_min} min` : t('detail.notSet') },
      { label: t('detail.age'), value: `${game.age_min ?? '?'} - ${game.age_max ?? '?'}` },
    ];
  }, [game, t]);

  if (!canView) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<ArrowLeftIcon className="h-6 w-6" />}
          title={t('detail.noAccess')}
          description={t('detail.noAccessDesc')}
        />
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout>
        <AdminErrorState title={t('detail.somethingWentWrong')} description={error} onRetry={load} />
      </AdminPageLayout>
    );
  }

  if (!game && isLoading) {
    return (
      <AdminPageLayout>
        <AdminPageHeader title={t('detail.loading')} description={t('detail.loadingGameData')} />
      </AdminPageLayout>
    );
  }

  if (!game) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<ArrowLeftIcon className="h-6 w-6" />}
          title={t('detail.gameNotFound')}
          description={t('detail.checkLinkOrGoBack')}
          action={{
            label: t('detail.backToGames'),
            onClick: () => router.push('/admin/games'),
          }}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: t('breadcrumbs.home'), href: '/admin' },
          { label: t('breadcrumbs.games'), href: '/admin/games' },
          { label: game.name },
        ]}
      />

      <AdminPageHeader
        title={game.name}
        description={game.short_description || t('detail.noShortDescription')}
        icon={<ArrowLeftIcon className="h-8 w-8 text-primary" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/games')}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              {t('detail.back')}
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <PencilSquareIcon className="mr-2 h-4 w-4" />
                {t('detail.edit')}
              </Button>
            )}
            <Button
              size="sm"
              variant={game.status === 'published' ? 'outline' : 'primary'}
              onClick={() => handlePublishToggle(game.status === 'published' ? 'draft' : 'published')}
            >
              {game.status === 'published' ? (
                <>
                  <XCircleIcon className="mr-2 h-4 w-4" />
                  {t('detail.makeDraft')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="mr-2 h-4 w-4" />
                  {t('detail.publish')}
                </>
              )}
            </Button>
            {canEdit && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <TrashIcon className="mr-2 h-4 w-4" />
                {t('detail.delete')}
              </Button>
            )}
          </div>
        }
      />

      <AdminStatGrid className="mb-4">
        <AdminStatCard label={t('detail.status')} value={game.status === 'published' ? t('detail.published') : t('detail.draft')} />
        <AdminStatCard label={t('detail.owner')} value={game.owner?.name || t('detail.global')} />
        <AdminStatCard label={t('detail.purpose')} value={game.main_purpose?.name || t('detail.notSet')} />
        <AdminStatCard label={t('detail.product')} value={game.product?.name || t('detail.notSet')} />
      </AdminStatGrid>

      <Card className="mb-4 border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>{t('detail.metadata')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {meta.map((item) => (
              <div key={item.label} className="space-y-1 rounded-md border border-border p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
                <p className="text-sm text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-border" />
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">{t('detail.description')}</p>
            <p className="text-sm whitespace-pre-line text-foreground">
              {game.description || t('detail.noDescription')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border">
        <CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
          <CardTitle>{t('detail.technical')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline">ID</Badge>
            <code className="text-xs">{game.id}</code>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('detail.createdAt')} {new Date(game.created_at).toLocaleString()} · {t('detail.updatedAt')} {new Date(game.updated_at).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <GameFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSubmit={handleUpdate}
        tenants={tenants}
        purposes={purposes}
        products={products}
        initialGame={game}
      />

      <AdminConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('detail.deleteTitle')}
        description={t('detail.deleteDescription')}
        confirmLabel={t('detail.deleteConfirm')}
        variant="danger"
        onConfirm={handleDelete}
      />
    </AdminPageLayout>
  );
}
