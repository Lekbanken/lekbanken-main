'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import {
  FolderIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  Button,
  Card,
  CardContent,
  Badge,
  EmptyState,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from "@/components/ui";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import type { Database } from "@/types/supabase";

type PurposeRow = Database["public"]["Tables"]["purposes"]["Row"];

type PurposeListItem = {
  id: string;
  name: string;
  purposeKey: string | null;
  type: "main" | "sub";
  parentId: string | null;
  parentName: string | null;
  productCount: number;
  createdAt: string | null;
};

const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
  main: "default",
  sub: "secondary",
};

export function PurposesTab() {
  const _router = useRouter(); // Reserved for future navigation
  const t = useTranslations('admin.products.purposesTab');
  const { can } = useRbac();
  const _toast = useToast(); // Reserved for future toast notifications

  const [purposes, setPurposes] = useState<PurposeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canCreate = can("admin.products.create");
  const canEdit = can("admin.products.edit");
  const canDelete = can("admin.products.edit"); // Using edit permission for delete actions

  useEffect(() => {
    let isMounted = true;

    const loadPurposes = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/purposes");
        if (!res.ok) throw new Error(`Failed to load purposes (${res.status})`);
        const data = await res.json();
        const rawPurposes = (data.purposes || []) as PurposeRow[];

        // Build a map for parent names
        const purposeMap = new Map(rawPurposes.map((p) => [p.id, p]));

        const items: PurposeListItem[] = rawPurposes.map((p) => {
          const parent = p.parent_id ? purposeMap.get(p.parent_id) : null;
          return {
            id: p.id,
            name: p.name,
            purposeKey: p.purpose_key,
            type: (p.type as "main" | "sub") || "main",
            parentId: p.parent_id,
            parentName: parent?.name ?? null,
            productCount: 0, // TODO: Get from join
            createdAt: p.created_at,
          };
        });

        if (isMounted) setPurposes(items);
      } catch (err) {
        console.error("Failed to load purposes", err);
        if (isMounted) setError(t('loadError'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadPurposes();
    return () => { isMounted = false; };
  }, []);

  const filteredPurposes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return purposes;
    return purposes.filter((p) =>
      [p.name, p.purposeKey, p.type, p.parentName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [purposes, searchQuery]);

  // Group by main/sub for hierarchy display (reserved for future use)
  const { mainPurposes: _mainPurposes, subPurposes: _subPurposes } = useMemo(() => {
    const main = filteredPurposes.filter((p) => p.type === "main");
    const sub = filteredPurposes.filter((p) => p.type === "sub");
    return { mainPurposes: main, subPurposes: sub };
  }, [filteredPurposes]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/10">
        <CardContent className="p-6 text-center">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            {t('newPurpose')}
          </Button>
        )}
      </div>

      {/* Purpose grid */}
      {filteredPurposes.length === 0 ? (
        <EmptyState
          title={searchQuery ? t('noMatchingPurposes') : t('noPurposesYet')}
          description={searchQuery ? t('adjustSearch') : t('createFirstPurpose')}
          action={!searchQuery && canCreate ? { label: t('createPurpose'), onClick: () => {} } : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPurposes.map((purpose) => {
            const typeVariant = typeVariants[purpose.type] ?? typeVariants.main;
            const typeLabel = purpose.type === 'main' ? t('typeMain') : t('typeSub');
            return (
              <Card
                key={purpose.id}
                className="group relative rounded-2xl border border-border/60 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        purpose.type === "main" ? "bg-purple-500/10 text-purple-600" : "bg-muted text-muted-foreground"
                      }`}>
                        <FolderIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{purpose.name}</h3>
                        <p className="text-xs font-mono text-muted-foreground">{purpose.purposeKey}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
                          {t('viewDetails')}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem>
                            <PencilSquareIcon className="mr-2 h-4 w-4" />
                            {t('edit')}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem className="text-destructive">
                            <TrashIcon className="mr-2 h-4 w-4" />
                            {t('delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Parent reference for sub-purposes */}
                  {purpose.parentName && (
                    <div className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
                      <ChevronRightIcon className="h-3 w-3" />
                      <span>{t('under', { parent: purpose.parentName })}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={typeVariant}>{typeLabel}</Badge>
                    {purpose.productCount > 0 && (
                      <Badge variant="outline">{t('productsCount', { count: purpose.productCount })}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
