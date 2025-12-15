 'use client';

import { useEffect, useState, useMemo } from "react";
import { UsersIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState, AdminErrorState, AdminCard } from "@/components/admin/shared";
import { Badge, Input } from "@/components/ui";
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

export default function TenantMembersPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const load = async () => {
      if (!active) return;
      setError(null);
      setIsLoading(true);
      const { data, error: queryError } = await supabase
        .from("user_tenant_memberships")
        .select("id, role, is_primary, user:users(id, email, full_name)")
        .eq("tenant_id", tenantId)
        .limit(200);

      if (!active) return;
      if (queryError) {
        console.error(queryError);
        setError("Kunde inte ladda medlemmar just nu.");
      } else {
        type MembershipQueryRow = {
          id: string | null;
          role: MemberRow["role"];
          is_primary: boolean | null;
          user: MemberRow["user"];
        };
        const rows = (data as MembershipQueryRow[] | null) ?? [];
        const normalized = rows
          .filter((row): row is MembershipQueryRow & { id: string } => typeof row.id === "string")
          .map((row) => ({ ...row, id: row.id as string }));
        setMembers(normalized);
      }
      setIsLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [tenantId]);

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
          title="Ingen organisation vald"
          description="Välj eller byt organisation för att se medlemmar."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Medlemmar"
        description="Hantera organisationens medlemmar och roller."
        icon={<UsersIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda medlemmar"
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Sök på namn, e-post eller roll"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar medlemmar...</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<UsersIcon className="h-6 w-6" />}
          title="Inga medlemmar"
          description="Det finns inga medlemmar att visa för denna organisation."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member) => (
            <AdminCard
              key={member.id}
              title={member.user?.full_name || member.user?.email || "Okänd användare"}
              description={member.user?.email || "Ingen e-post"}
              icon={<UsersIcon className="h-5 w-5 text-primary" />}
              actions={
                <Badge variant="outline" className="capitalize">
                  {member.role}
                </Badge>
              }
            >
              <p className="text-xs text-muted-foreground">
                {member.is_primary ? "Primär kontakt" : "Medlem"}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
