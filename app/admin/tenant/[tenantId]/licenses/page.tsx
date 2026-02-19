'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminPageHeader,
  AdminPageLayout,
} from '@/components/admin/shared';
import { Badge, Button, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { useTenant } from '@/lib/context/TenantContext';
import { supabase } from '@/lib/supabase/client';

type EntitlementRow = {
  id: string;
  status: string;
  quantity_seats: number;
  valid_from: string;
  valid_to: string | null;
  source: string;
  product: { id: string; name: string | null; product_key: string } | null;
};

type MemberRow = {
  user_id: string;
  role: string | null;
  user: { id: string; email: string | null; full_name: string | null } | null;
};

type SeatAssignmentRow = {
  id: string;
  entitlement_id: string;
  user_id: string;
  status: string;
  assigned_at: string;
  released_at: string | null;
  user: { id: string; email: string | null; full_name: string | null } | null;
};

export default function TenantLicensesPage() {
  const t = useTranslations('admin.tenant.licenses');
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;
  const { success, warning } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignmentRow[]>([]);

  const [selectedMemberByEntitlement, setSelectedMemberByEntitlement] = useState<Record<string, string>>({});

  const load = useCallback(async (tid: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const [{ data: entData, error: entError }, { data: memData, error: memError }, { data: asgData, error: asgError }] =
        await Promise.all([
          supabase
            .from('tenant_product_entitlements')
            .select(
              'id, status, quantity_seats, valid_from, valid_to, source, product:products(id, name, product_key)'
            )
            .eq('tenant_id', tid)
            .order('created_at', { ascending: false }),
          supabase
            .from('user_tenant_memberships')
            .select('user_id, role, user:users(id, email, full_name)')
            .eq('tenant_id', tid)
            .limit(500),
          supabase
            .from('tenant_entitlement_seat_assignments')
            .select(
              'id, entitlement_id, user_id, status, assigned_at, released_at, user:users!tenant_entitlement_seat_assignments_user_id_fkey(id, email, full_name)'
            )
            .eq('tenant_id', tid)
            .order('assigned_at', { ascending: false })
            .limit(2000),
        ]);

      if (entError) throw entError;
      if (memError) throw memError;
      if (asgError) throw asgError;

      setEntitlements(((entData as EntitlementRow[] | null) ?? []).filter((e) => typeof e?.id === 'string'));
      setMembers(((memData as MemberRow[] | null) ?? []).filter((m) => typeof m?.user_id === 'string'));
      setAssignments(((asgData as SeatAssignmentRow[] | null) ?? []).filter((a) => typeof a?.id === 'string'));
    } catch (err) {
      console.error(err);
      setError(t('errorDescription'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!tenantId) return;
    void load(tenantId);
  }, [tenantId, load]);

  const membersSorted = useMemo(() => {
    return [...members].sort((a, b) => {
      const an = (a.user?.full_name ?? a.user?.email ?? '').toLowerCase();
      const bn = (b.user?.full_name ?? b.user?.email ?? '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [members]);

  const activeAssignmentsByEntitlement = useMemo(() => {
    const map = new Map<string, SeatAssignmentRow[]>();
    for (const a of assignments) {
      if (a.status !== 'active') continue;
      const arr = map.get(a.entitlement_id) ?? [];
      arr.push(a);
      map.set(a.entitlement_id, arr);
    }
    return map;
  }, [assignments]);

  const handleAssign = async (entitlementId: string) => {
    if (!tenantId) return;

    const userId = selectedMemberByEntitlement[entitlementId];
    if (!userId) {
      warning(t('toasts.selectMember'));
      return;
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData.user?.id ?? null;

      const { error: insertError } = await supabase
        .from('tenant_entitlement_seat_assignments')
        .insert({
          tenant_id: tenantId,
          entitlement_id: entitlementId,
          user_id: userId,
          assigned_by: assignedBy,
          status: 'active',
        });

      if (insertError) throw insertError;

      success(t('toasts.seatAssigned'));
      await load(tenantId);
    } catch (err) {
      console.error(err);
      warning(t('toasts.assignFailed'));
    }
  };

  const handleRelease = async (assignmentId: string) => {
    if (!tenantId) return;

    try {
      const { error: updateError } = await supabase
        .from('tenant_entitlement_seat_assignments')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      success(t('toasts.seatReleased'));
      await load(tenantId);
    } catch (err) {
      console.error(err);
      warning(t('toasts.releaseFailed'));
    }
  };

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<KeyIcon className="h-6 w-6" />}
          title={t('noOrganizationTitle')}
          description={t('noOrganizationDescription')}
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title={t('title')}
        description={t('description')}
        icon={<KeyIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title={t('errorTitle')}
          description={error}
          onRetry={() => void load(tenantId)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : entitlements.length === 0 ? (
        <AdminEmptyState
          icon={<KeyIcon className="h-6 w-6" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="space-y-4">
          {entitlements.map((ent) => {
            const activeAssignments = activeAssignmentsByEntitlement.get(ent.id) ?? [];
            const used = activeAssignments.length;
            const max = ent.quantity_seats;

            return (
              <AdminCard
                key={ent.id}
                title={ent.product?.name ?? ent.product?.product_key ?? t('unknownProduct')}
                description={`${t('labels.source')}: ${ent.source} • ${t('labels.valid')}: ${new Date(ent.valid_from).toLocaleDateString()}${
                  ent.valid_to ? `–${new Date(ent.valid_to).toLocaleDateString()}` : ''
                }`}
                icon={<KeyIcon className="h-5 w-5 text-primary" />}
                actions={
                  <div className="flex items-center gap-2">
                    <Badge variant={ent.status === 'active' ? 'default' : 'outline'} className="capitalize">
                      {ent.status}
                    </Badge>
                    <Badge variant="outline">
                      {t('labels.seatsUsed', { used, max })}
                    </Badge>
                  </div>
                }
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={selectedMemberByEntitlement[ent.id] ?? ''}
                      onChange={(e) =>
                        setSelectedMemberByEntitlement((prev) => ({ ...prev, [ent.id]: e.target.value }))
                      }
                      placeholder={t('labels.selectMember')}
                      options={membersSorted.map((m) => ({
                        value: m.user_id,
                        label: m.user?.full_name || m.user?.email || m.user_id,
                      }))}
                    />

                    <Button
                      size="sm"
                      onClick={() => void handleAssign(ent.id)}
                      disabled={ent.status !== 'active'}
                    >
                      {t('actions.assignSeat')}
                    </Button>
                  </div>

                  {activeAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('emptyAssignments')}</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {activeAssignments.map((a) => (
                        <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {a.user?.full_name || a.user?.email || a.user_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('labels.assignedAt', { date: new Date(a.assigned_at).toLocaleDateString() })}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => void handleRelease(a.id)}>
                            {t('actions.release')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}
    </AdminPageLayout>
  );
}
