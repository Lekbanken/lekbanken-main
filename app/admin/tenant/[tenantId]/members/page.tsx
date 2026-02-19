 'use client';

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from 'next-intl';
import { UsersIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminErrorState, AdminCard } from "@/components/admin/shared";
import { Badge, Button, Input, Select } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useTenant } from "@/lib/context/TenantContext";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type MemberRow = {
  id: string;
  role: Database["public"]["Enums"]["tenant_role_enum"] | null;
  is_primary?: boolean | null;
  user?: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type EntitlementRow = {
  id: string;
  status: string;
  quantity_seats: number;
  product: { id: string; name: string | null; product_key: string } | null;
};

type SeatAssignmentRow = {
  id: string;
  entitlement_id: string;
  user_id: string;
  status: string;
  assigned_at: string;
  user: { id: string; email: string | null; full_name: string | null } | null;
};

export default function TenantMembersPage() {
  const t = useTranslations('admin.tenant.members');
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;
  const { success, warning } = useToast();

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRow[]>([]);
  const [assignments, setAssignments] = useState<SeatAssignmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedEntitlementByMember, setSelectedEntitlementByMember] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const load = async () => {
      if (!active) return;
      setError(null);
      setIsLoading(true);

      const [membersRes, entRes, asgRes] = await Promise.all([
        supabase
          .from("user_tenant_memberships")
          .select("id, role, is_primary, user:users(id, email, full_name)")
          .eq("tenant_id", tenantId)
          .limit(200),
        supabase
          .from('tenant_product_entitlements')
          .select('id, status, quantity_seats, product:products(id, name, product_key)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('tenant_entitlement_seat_assignments')
          .select(
            'id, entitlement_id, user_id, status, assigned_at, user:users!tenant_entitlement_seat_assignments_user_id_fkey(id, email, full_name)'
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('assigned_at', { ascending: false })
          .limit(2000),
      ]);

      if (!active) return;

      if (membersRes.error || entRes.error || asgRes.error) {
        console.error(membersRes.error || entRes.error || asgRes.error);
        setError(t('errorDescription'));
        setIsLoading(false);
        return;
      }

      type MembershipQueryRow = {
        id: string | null;
        role: MemberRow["role"];
        is_primary: boolean | null;
        user: MemberRow["user"];
      };
      const rows = (membersRes.data as MembershipQueryRow[] | null) ?? [];
      const normalized = rows
        .filter((row): row is MembershipQueryRow & { id: string } => typeof row.id === "string")
        .map((row) => ({ ...row, id: row.id as string }));
      setMembers(normalized);

      setEntitlements(((entRes.data as EntitlementRow[] | null) ?? []).filter((e) => typeof e?.id === 'string'));
      setAssignments(((asgRes.data as SeatAssignmentRow[] | null) ?? []).filter((a) => typeof a?.id === 'string'));

      setIsLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [tenantId, t]);

  const entitlementsSorted = useMemo(() => {
    return [...entitlements].sort((a, b) => {
      const an = (a.product?.name ?? a.product?.product_key ?? '').toLowerCase();
      const bn = (b.product?.name ?? b.product?.product_key ?? '').toLowerCase();
      return an.localeCompare(bn);
    });
  }, [entitlements]);

  const entitlementById = useMemo(() => {
    const map = new Map<string, EntitlementRow>();
    for (const e of entitlements) map.set(e.id, e);
    return map;
  }, [entitlements]);

  const activeAssignmentsByUser = useMemo(() => {
    const map = new Map<string, SeatAssignmentRow[]>();
    for (const a of assignments) {
      if (a.status !== 'active') continue;
      const arr = map.get(a.user_id) ?? [];
      arr.push(a);
      map.set(a.user_id, arr);
    }
    return map;
  }, [assignments]);

  const usedSeatsByEntitlement = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      if (a.status !== 'active') continue;
      map.set(a.entitlement_id, (map.get(a.entitlement_id) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const reload = async () => {
    if (!tenantId) return;
    // Re-run effect logic via a small fetch sequence.
    setIsLoading(true);
    setError(null);
    try {
      const [membersRes, entRes, asgRes] = await Promise.all([
        supabase
          .from("user_tenant_memberships")
          .select("id, role, is_primary, user:users(id, email, full_name)")
          .eq("tenant_id", tenantId)
          .limit(200),
        supabase
          .from('tenant_product_entitlements')
          .select('id, status, quantity_seats, product:products(id, name, product_key)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('tenant_entitlement_seat_assignments')
          .select(
            'id, entitlement_id, user_id, status, assigned_at, user:users!tenant_entitlement_seat_assignments_user_id_fkey(id, email, full_name)'
          )
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('assigned_at', { ascending: false })
          .limit(2000),
      ]);

      if (membersRes.error || entRes.error || asgRes.error) throw (membersRes.error || entRes.error || asgRes.error);

      type MembershipQueryRow = {
        id: string | null;
        role: MemberRow["role"];
        is_primary: boolean | null;
        user: MemberRow["user"];
      };
      const rows = (membersRes.data as MembershipQueryRow[] | null) ?? [];
      const normalized = rows
        .filter((row): row is MembershipQueryRow & { id: string } => typeof row.id === "string")
        .map((row) => ({ ...row, id: row.id as string }));
      setMembers(normalized);
      setEntitlements(((entRes.data as EntitlementRow[] | null) ?? []).filter((e) => typeof e?.id === 'string'));
      setAssignments(((asgRes.data as SeatAssignmentRow[] | null) ?? []).filter((a) => typeof a?.id === 'string'));
    } catch (err) {
      console.error(err);
      setError(t('errorDescription'));
    } finally {
      setIsLoading(false);
    }
  };

  const assignSeat = async (memberUserId: string) => {
    if (!tenantId) return;
    const entitlementId = selectedEntitlementByMember[memberUserId];
    if (!entitlementId) {
      warning(t('licensing.toasts.selectLicense'));
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
          user_id: memberUserId,
          assigned_by: assignedBy,
          status: 'active',
        });

      if (insertError) throw insertError;
      success(t('licensing.toasts.seatAssigned'));
      await reload();
    } catch (err) {
      console.error(err);
      warning(t('licensing.toasts.assignFailed'));
    }
  };

  const releaseSeat = async (assignmentId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('tenant_entitlement_seat_assignments')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (updateError) throw updateError;
      success(t('licensing.toasts.seatReleased'));
      await reload();
    } catch (err) {
      console.error(err);
      warning(t('licensing.toasts.releaseFailed'));
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) =>
      [m.user?.full_name, m.user?.email, m.role].some((v) => v?.toLowerCase().includes(term))
    );
  }, [members, search]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<UsersIcon className="h-6 w-6" />}
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
        icon={<UsersIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title={t('errorTitle')}
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member) => (
            <AdminCard
              key={member.id}
              title={member.user?.full_name || member.user?.email || t('unknownUser')}
              description={member.user?.email || t('noEmail')}
              icon={<UsersIcon className="h-5 w-5 text-primary" />}
              actions={
                <Badge variant="outline" className="capitalize">
                  {member.role}
                </Badge>
              }
            >
              <p className="text-xs text-muted-foreground">
                {member.is_primary ? t('primaryContact') : t('member')}
              </p>

              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('licensing.title')}</p>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    className="min-w-[200px]"
                    value={selectedEntitlementByMember[member.user?.id ?? ''] ?? ''}
                    onChange={(e) => {
                      const uid = member.user?.id;
                      if (!uid) return;
                      setSelectedEntitlementByMember((prev) => ({ ...prev, [uid]: e.target.value }));
                    }}
                    disabled={!member.user?.id || entitlementsSorted.length === 0}
                    placeholder={t('licensing.selectPlaceholder')}
                    options={entitlementsSorted
                      .filter((e) => e.status === 'active')
                      .map((e) => {
                        const label = e.product?.name ?? e.product?.product_key ?? e.id;
                        const used = usedSeatsByEntitlement.get(e.id) ?? 0;
                        const max = e.quantity_seats;
                        return { value: e.id, label: `${label} (${used}/${max})` };
                      })}
                  />

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const uid = member.user?.id;
                      if (!uid) return;
                      void assignSeat(uid);
                    }}
                    disabled={!member.user?.id || entitlementsSorted.length === 0}
                  >
                    {t('licensing.actions.assign')}
                  </Button>
                </div>

                {(() => {
                  const uid = member.user?.id;
                  if (!uid) return <p className="text-xs text-muted-foreground">{t('licensing.errors.unknownUserId')}</p>;

                  const userAssignments = activeAssignmentsByUser.get(uid) ?? [];
                  if (userAssignments.length === 0) {
                    return <p className="text-xs text-muted-foreground">{t('licensing.emptyAssignments')}</p>;
                  }

                  return (
                    <div className="space-y-1">
                      {userAssignments.map((a) => {
                        const ent = entitlementById.get(a.entitlement_id);
                        const label = ent?.product?.name ?? ent?.product?.product_key ?? a.entitlement_id;
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{label}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {t('licensing.labels.assignedAt', { date: new Date(a.assigned_at).toLocaleDateString() })}
                              </p>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => void releaseSeat(a.id)}>
                              {t('licensing.actions.release')}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
