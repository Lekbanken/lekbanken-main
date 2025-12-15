 'use client';

import { useEffect, useMemo, useState } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminEmptyState,
  AdminErrorState,
  AdminCard,
} from "@/components/admin/shared";
import { Input } from "@/components/ui";
import { useTenant } from "@/lib/context/TenantContext";
import { getContentItems, type ContentItem } from "@/lib/services/contentService";

type ContentType = ContentItem["type"] | "all";

export default function TenantContentPage() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id ?? null;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContentType>("all");

  useEffect(() => {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const data = await getContentItems(tenantId, { onlyPublished: true, limit: 100 });
        setItems(data || []);
      } catch (err) {
        console.error(err);
        setError("Kunde inte ladda material för organisationen.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [tenantId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (!term) return true;
      return [item.title, item.description].some((v) => v?.toLowerCase().includes(term));
    });
  }, [items, search, typeFilter]);

  if (!tenantId) {
    return (
      <AdminPageLayout>
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title="Ingen organisation vald"
          description="Välj eller byt organisation för att se material."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Material"
        description="Hantera organisationens material och bibliotek."
        icon={<DocumentTextIcon className="h-8 w-8 text-primary" />}
      />

      {error && (
        <AdminErrorState
          title="Kunde inte ladda material"
          description={error}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Sök på titel eller beskrivning"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ContentType)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">Alla typer</option>
          <option value="game">Game</option>
          <option value="lesson">Lesson</option>
          <option value="resource">Resource</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laddar material...</p>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<DocumentTextIcon className="h-6 w-6" />}
          title="Inget material"
          description="Inget material hittades för denna organisation."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <AdminCard
              key={item.id}
              title={item.title}
              description={item.description || "Ingen beskrivning"}
              icon={<DocumentTextIcon className="h-5 w-5 text-primary" />}
            >
              <p className="text-xs text-muted-foreground">
                {item.type} • {item.is_published ? "Publicerad" : "Draft"}
              </p>
            </AdminCard>
          ))}
        </div>
      )}
    </AdminPageLayout>
  );
}
