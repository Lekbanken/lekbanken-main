'use client';

import { useEffect, useMemo, useState } from "react";
import {
  CubeIcon,
  PlusIcon,
  CheckBadgeIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingState, Select, useToast } from "@/components/ui";
import { SkeletonStats } from "@/components/ui/skeleton";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminStatCard,
  AdminStatGrid,
  AdminBreadcrumbs,
  AdminEmptyState,
} from "@/components/admin/shared";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { useAuth } from "@/lib/supabase/auth";
import type { Database } from "@/types/supabase";
import { getBaseCapabilities } from "./data";
import type { ProductAdminItem, ProductFilters, ProductStatus } from "./types";
import { ProductTable } from "./components/ProductTable";
import { ProductTableToolbar } from "./components/ProductTableToolbar";
import { ProductCreateDialog } from "./components/ProductCreateDialog";
import { ProductEditDialog } from "./components/ProductEditDialog";
import { ProductCapabilitiesEditor } from "./components/ProductCapabilitiesEditor";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type PurposeRow = Database["public"]["Tables"]["purposes"]["Row"];

type ProductRowWithPurposes = ProductRow & {
  purposes?: Array<{ purpose?: Pick<PurposeRow, "id" | "name" | "type" | "purpose_key"> | null }>
};

const PRODUCTS_PER_PAGE = 10;
const fallbackStatus: ProductStatus = "active";

export function ProductAdminPage() {
  const { user } = useAuth();
  const { success, info, warning } = useToast();
  const { can } = useRbac();

  const canViewProducts = can("admin.products.list");
  const canCreateProduct = can("admin.products.create");

  const [products, setProducts] = useState<ProductAdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "discounts" | "images">("products");
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "all",
    category: "all",
    sort: "recent",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAdminItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [purposes, setPurposes] = useState<{ value: string; label: string }[]>([]);

  const baseCapabilities = useMemo(() => getBaseCapabilities(), []);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, purposesRes] = await Promise.all([fetch("/api/products"), fetch("/api/purposes")]);
        if (!productsRes.ok) {
          throw new Error(`Failed to load products (${productsRes.status})`);
        }
        const json = (await productsRes.json()) as { products: ProductRowWithPurposes[] };
        const mapped: ProductAdminItem[] = (json.products || []).map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          description: row.description,
          purposeId: row.purposes?.[0]?.purpose?.id ?? null,
          purposeName: row.purposes?.[0]?.purpose?.name ?? null,
          status: (row.status as ProductStatus) || fallbackStatus,
          capabilities: Array.isArray(row.capabilities)
            ? (row.capabilities as unknown as ProductAdminItem["capabilities"])
            : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        const purposesJson = purposesRes.ok
          ? ((await purposesRes.json()) as { purposes?: PurposeRow[] })
          : { purposes: [] as PurposeRow[] };
        const mainPurposeOptions =
          (purposesJson.purposes || [])
            .filter((p) => p.type === "main")
            .map((p) => ({ value: p.id as string, label: p.name || p.purpose_key || "Purpose" })) ?? [];

        if (!isMounted) return;
        setProducts(mapped);
        setPurposes(mainPurposeOptions);
      } catch (err) {
        console.error("Failed to load products", err);
        if (!isMounted) return;
        setError("Failed to load products.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();
    return () => {
      isMounted = false;
    };
  }, [userId, baseCapabilities]);

  const handleFiltersChange = (next: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const syncPurpose = async (productId: string, nextPurposeId: string | null, prevPurposeId?: string | null) => {
    try {
      if (prevPurposeId && prevPurposeId !== nextPurposeId) {
        await fetch(`/api/products/${productId}/purposes/${prevPurposeId}`, { method: "DELETE" });
      }
      if (nextPurposeId) {
        await fetch(`/api/products/${productId}/purposes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purpose_id: nextPurposeId }),
        });
      }
    } catch (err) {
      console.error("[products] sync purpose failed", err);
    }
  };

  const handleCreate = async (payload: Omit<ProductAdminItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || (json.errors || []).join(", ") || "Create failed");
      }

      const json = (await response.json()) as { product: ProductRow };
      const created = json.product;
      const newProduct: ProductAdminItem = {
        id: created.id,
        name: created.name,
        category: created.category,
        description: created.description,
        purposeId: payload.purposeId ?? null,
        purposeName: payload.purposeName ?? null,
        status: (created.status as ProductStatus) || payload.status || fallbackStatus,
        capabilities: Array.isArray(created.capabilities)
          ? (created.capabilities as unknown as ProductAdminItem["capabilities"])
          : payload.capabilities,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };
      if (payload.purposeId) {
        void syncPurpose(created.id, payload.purposeId, null);
      }
      setProducts((prev) => [newProduct, ...prev]);
      info("Product created.", "Product created");
    } catch (err) {
      console.error("Create product failed", err);
      warning("Failed to create product.", "Create failed");
    } finally {
      setCreateOpen(false);
    }
  };

  const handleEditSubmit = async (payload: ProductAdminItem) => {
    try {
      const response = await fetch(`/api/products/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || (json.errors || []).join(", ") || "Update failed");
      }

      const json = (await response.json()) as { product: ProductRow };
      const updated = json.product;
      const mapped: ProductAdminItem = {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        description: updated.description,
        purposeId: payload.purposeId ?? null,
        purposeName: payload.purposeName ?? null,
        status: (updated.status as ProductStatus) || payload.status,
        capabilities: Array.isArray(updated.capabilities)
          ? (updated.capabilities as unknown as ProductAdminItem["capabilities"])
          : payload.capabilities,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      };

      setProducts((prev) => prev.map((p) => (p.id === payload.id ? mapped : p)));
      const prevPurposeId = products.find((p) => p.id === payload.id)?.purposeId ?? null;
      if (prevPurposeId !== payload.purposeId) {
        void syncPurpose(payload.id, payload.purposeId ?? null, prevPurposeId);
      }
      success("Changes saved.", "Product updated");
    } catch (err) {
      console.error("Update product failed", err);
      warning("Failed to update product.", "Update failed");
    } finally {
      setEditingProduct(null);
    }
  };

  const handleStatusChange = (productId: string, status: ProductStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, status, updatedAt: new Date().toISOString() } : p)),
    );
    success(`Product is now ${status}.`, "Status updated");
  };

  const handleRemove = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || "Delete failed");
      }
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      warning("Product removed.", "Deleted");
    } catch (err) {
      console.error("Remove product failed", err);
      warning("Failed to delete product.", "Delete failed");
    }
  };

  const filteredProducts = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const bySearch = products.filter((product) => {
      const haystack = [
        product.name,
        product.description ?? "",
        product.category,
        product.capabilities.map((c) => c.label).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    const byStatus =
      filters.status === "all" ? bySearch : bySearch.filter((product) => product.status === filters.status);

    const byCategory =
      filters.category === "all" ? byStatus : byStatus.filter((product) => product.category === filters.category);

    const sorted = [...byCategory].sort((a, b) => {
      if (filters.sort === "name") return a.name.localeCompare(b.name);
      if (filters.sort === "capabilities") return (b.capabilities?.length ?? 0) - (a.capabilities?.length ?? 0);
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return sorted;
  }, [filters.category, filters.search, filters.sort, filters.status, products]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * PRODUCTS_PER_PAGE,
    safePage * PRODUCTS_PER_PAGE,
  );

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };
  const pageNumbers = getPageNumbers();

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).filter(Boolean),
    [products],
  );

  const statusCounts = useMemo(
    () =>
      products.reduce(
        (acc, product) => {
          acc[product.status] += 1;
          return acc;
        },
        { active: 0, inactive: 0 } as Record<ProductStatus, number>,
      ),
    [products],
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const key = p.category || "Okand";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.sort !== "recent";

  if (isLoading && products.length === 0) {
    return (
      <AdminPageLayout>
        <AdminPageHeader
          icon={<CubeIcon className="h-6 w-6" />}
          title="Produkter"
          description="Konfigurera produkter, moduler och deras formagor"
        />
        <SkeletonStats />
        <LoadingState message="Laddar produkter..." />
      </AdminPageLayout>
    );
  }

  if (!user || !canViewProducts) {
    return (
      <EmptyState
        title="Ingen atkomst"
        description="Du behover vara inloggad for att hantera produkter."
        action={{ label: "Ga till login", onClick: () => (window.location.href = "/auth/login") }}
      />
    );
  }

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={[{ label: "Startsida", href: "/admin" }, { label: "Produkter" }]} />

      <AdminPageHeader
        icon={<CubeIcon className="h-6 w-6" />}
        title="Produkter"
        description="Konfigurera produkter, moduler och deras formagor"
        actions={
          canCreateProduct && (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Skapa produkt
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={activeTab === "products" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("products")}>
          Produkter
        </Button>
        <Button variant={activeTab === "categories" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("categories")}>
          Kategorier
        </Button>
        <Button variant={activeTab === "discounts" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("discounts")}>
          Rabatter
        </Button>
        <Button variant={activeTab === "images" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("images")}>
          Standardbilder
        </Button>
      </div>

      {activeTab === "products" && (
        <>
          <AdminStatGrid cols={3}>
            <AdminStatCard label="Totalt produkter" value={products.length} icon={<CubeIcon className="h-5 w-5" />} />
            <AdminStatCard label="Aktiva" value={statusCounts.active} icon={<CheckBadgeIcon className="h-5 w-5" />} iconColor="green" />
            <AdminStatCard label="Inaktiva" value={statusCounts.inactive} icon={<PauseCircleIcon className="h-5 w-5" />} iconColor="amber" />
          </AdminStatGrid>

          <Card className="overflow-hidden rounded-xl border border-border">
            <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">Product Directory</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTableToolbar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                categories={categories}
                hasActiveFilters={hasActiveFilters}
              />
              <div className="border-t border-border">
                <ProductTable
                  products={paginatedProducts}
                  isLoading={isLoading}
                  searchQuery={filters.search}
                  onEdit={setEditingProduct}
                  onStatusChange={handleStatusChange}
                  onRemove={handleRemove}
                />
              </div>
              {filteredProducts.length > PRODUCTS_PER_PAGE && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-4 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    Showing {(safePage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(safePage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                      Previous
                    </Button>
                    {pageNumbers.map((page, idx) =>
                      typeof page === "number" ? (
                        <Button
                          key={page}
                          variant={page === safePage ? "default" : "outline"}
                          size="sm"
                          className="min-w-[36px]"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ) : (
                        <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                          …
                        </span>
                      )
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
              {error && (
                <div className="border-t border-border bg-amber-500/10 px-6 py-3 text-sm text-amber-700">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "categories" && (
        <Card className="overflow-hidden rounded-xl border border-border">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-foreground">Kategorier</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {categoryStats.length === 0 ? (
              <AdminEmptyState title="Inga kategorier" description="Skapa minst en produkt för att se kategorier." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {categoryStats.map((cat) => (
                  <div key={cat.name} className="rounded-lg border border-border bg-muted/20 p-4">
                    <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} produkter</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "discounts" && (
        <Card className="overflow-hidden rounded-xl border border-border">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-foreground">Rabatter</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <AdminEmptyState
              title="Rabatter ej konfigurerade"
              description="Lägg till rabattnivåer (min-max antal → rabatt %) i kommande iteration."
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "images" && (
        <Card className="overflow-hidden rounded-xl border border-border">
          <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
            <CardTitle className="text-lg font-semibold text-foreground">Standardbilder</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="font-semibold text-foreground">Mappning Produkt × Huvudsyfte</p>
                <p className="text-sm text-muted-foreground">
                  Standardbilder väljs per kombination av produkt och huvudsyfte. Om en lek saknar egen omslagsbild
                  och har produkt + huvudsyfte satt, används denna mappning.
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  <li>Välj produkt och huvudsyfte.</li>
                  <li>Välj/ersätt standardbild (per tenant om relevant).</li>
                  <li>Fallback: global standardbild om mappning saknas.</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  API/storagemappning behöver införas: product_purpose_media (product_id, purpose_id, media_id, priority, tenant_id?).
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
                <p className="font-semibold text-foreground">Snabbkonfiguration (kommmer)</p>
                <p className="text-sm text-muted-foreground">
                  Detta gränssnitt reserverat för uppladdning/val av media per kombination. Det aktiveras när API:erna finns.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Produkt</label>
                    <Select value={""} options={[{ value: "", label: "Välj" }]} disabled />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Huvudsyfte</label>
                    <Select value={""} options={[{ value: "", label: "Välj" }]} disabled />
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Välj standardbild (kommer snart)
                </Button>
                <p className="text-xs text-muted-foreground">När API:et är klart kopplas detta till media-picker och sparar till mappningstabellen.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ProductCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        capabilities={baseCapabilities}
        purposes={purposes}
      />

      <ProductEditDialog
        open={Boolean(editingProduct)}
        product={editingProduct}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
        }}
        onSubmit={handleEditSubmit}
        capabilities={baseCapabilities}
        purposes={purposes}
      />

      <div className="hidden">
        <ProductCapabilitiesEditor capabilities={baseCapabilities} value={[]} onChange={() => {}} />
      </div>
    </AdminPageLayout>
  );
}
