'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';
import {
  CubeIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
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

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type PurposeRow = Database["public"]["Tables"]["purposes"]["Row"];

type ProductWithPurpose = ProductRow & {
  purposes?: Array<{ purpose?: Pick<PurposeRow, "id" | "name" | "type" | "purpose_key"> | null }>;
};

type ProductListItem = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  status: string;
  purposeName: string | null;
  purposeId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  draft: "outline",
  archived: "destructive",
};

export function ProductsTab() {
  const router = useRouter();
  const t = useTranslations('admin.products.productsTab');
  const { can } = useRbac();
  const _toast = useToast(); // Reserved for future toast notifications

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const canCreate = can("admin.products.create");
  const canEdit = can("admin.products.edit");
  const canDelete = can("admin.products.edit"); // Using edit permission for delete actions

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const data = await res.json();
        const items: ProductListItem[] = ((data.products || []) as ProductWithPurpose[]).map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          status: p.status || "active",
          purposeName: p.purposes?.[0]?.purpose?.name ?? null,
          purposeId: p.purposes?.[0]?.purpose?.id ?? null,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        if (isMounted) setProducts(items);
      } catch (err) {
        console.error("Failed to load products", err);
        if (isMounted) setError(t('loadError'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadProducts();
    return () => { isMounted = false; };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) =>
      [p.name, p.category, p.description ?? "", p.purposeName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [products, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
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
            {t('newProduct')}
          </Button>
        )}
      </div>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title={searchQuery ? t('noMatchingProducts') : t('noProductsYet')}
          description={searchQuery ? t('adjustSearch') : t('createFirstProduct')}
          action={!searchQuery && canCreate ? { label: t('createProduct'), onClick: () => {} } : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => {
            const statusVariant = statusVariants[product.status] ?? statusVariants.active;
            const statusLabel = product.status === 'active' ? t('statusActive') : product.status === 'inactive' ? t('statusInactive') : product.status === 'draft' ? t('statusDraft') : t('statusArchived');
            return (
              <Card
                key={product.id}
                className="group relative rounded-2xl border border-border/60 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CubeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{product.name}</h3>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}`)}>
                          <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
                          {t('view')}
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem onClick={() => router.push(`/admin/products/${product.id}/edit`)}>
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

                  {/* Description */}
                  {product.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {product.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                    {product.purposeName && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => router.push(`/admin/products?tab=purposes&highlight=${product.purposeId}`)}
                      >
                        {product.purposeName}
                      </Badge>
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
