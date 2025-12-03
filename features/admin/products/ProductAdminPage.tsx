'use client';

import { useEffect, useMemo, useState } from "react";
import {
  CubeIcon,
  PlusIcon,
  CheckBadgeIcon,
  PauseCircleIcon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingState, useToast } from "@/components/ui";
import { SkeletonStats } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/supabase/auth";
import type { Database } from "@/types/supabase";
import { mockProducts, getBaseCapabilities } from "./data";
import { ProductAdminItem, ProductFilters, ProductStatus } from "./types";
import { ProductTable } from "./components/ProductTable";
import { ProductTableToolbar } from "./components/ProductTableToolbar";
import { ProductCreateDialog } from "./components/ProductCreateDialog";
import { ProductEditDialog } from "./components/ProductEditDialog";
import { ProductCapabilitiesEditor } from "./components/ProductCapabilitiesEditor";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

const PRODUCTS_PER_PAGE = 10;

export function ProductAdminPage() {
  const { user } = useAuth();
  const { success, info, warning } = useToast();

  const [products, setProducts] = useState<ProductAdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({
    search: "",
    status: "all",
    category: "all",
    sort: "recent",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAdminItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const baseCapabilities = useMemo(() => getBaseCapabilities(), []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (queryError) {
          throw queryError;
        }

        const mapped: ProductAdminItem[] = (data || []).map((row: ProductRow) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          description: row.description,
          status: "active",
          capabilities: baseCapabilities.slice(0, 3),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        if (!isMounted) return;
        setProducts(mapped);
      } catch (err) {
        console.error("Failed to load products", err);
        if (!isMounted) return;
        setError("Failed to load products from Supabase. Showing sample data instead.");
        setProducts(mockProducts);
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
  }, [user, user?.id, baseCapabilities]);

  const handleFiltersChange = (next: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setCurrentPage(1);
  };

  const handleCreate = async (payload: Omit<ProductAdminItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      const now = new Date().toISOString();
      const { data, error: insertError } = await supabase
        .from("products")
        .insert({
          name: payload.name,
          category: payload.category,
          description: payload.description ?? null,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();

      if (insertError || !data) {
        throw insertError || new Error("No data returned");
      }

      const newProduct: ProductAdminItem = {
        ...payload,
        id: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setProducts((prev) => [newProduct, ...prev]);
      info("Product created.", "Product created");
    } catch (err) {
      console.error("Create product failed, falling back to local", err);
      const fallback: ProductAdminItem = {
        ...payload,
        id: `prod-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setProducts((prev) => [fallback, ...prev]);
      warning("Saved locally only (Supabase insert failed).", "Offline fallback");
    } finally {
      setCreateOpen(false);
    }
  };

  const handleEditSubmit = async (payload: ProductAdminItem) => {
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: payload.name,
          category: payload.category,
          description: payload.description ?? null,
          updated_at: now,
        })
        .eq("id", payload.id);

      if (updateError) throw updateError;

      setProducts((prev) => prev.map((p) => (p.id === payload.id ? { ...payload, updatedAt: now } : p)));
      success("Changes saved.", "Product updated");
    } catch (err) {
      console.error("Update product failed, keeping local changes", err);
      setProducts((prev) => prev.map((p) => (p.id === payload.id ? payload : p)));
      warning("Updated locally only (Supabase update failed).", "Offline fallback");
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
      const { error: deleteError } = await supabase.from("products").delete().eq("id", productId);
      if (deleteError) throw deleteError;
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      warning("Product removed.", "Deleted");
    } catch (err) {
      console.error("Remove product failed", err);
      warning("Failed to delete from Supabase. Item remains.", "Delete failed");
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

  // Generate page numbers with ellipsis
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

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.category !== "all" ||
    filters.sort !== "recent";

  if (isLoading && products.length === 0) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
            <CubeIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground">
              Configure products, modules, and their capabilities
            </p>
          </div>
        </header>
        <SkeletonStats />
        <LoadingState message="Loading products..." />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="No access"
        description="You need to be signed in to manage products."
        action={{ label: "Go to login", onClick: () => (window.location.href = "/auth/login") }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
          <CubeIcon className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            Configure products, modules, and their capabilities
          </p>
        </div>
      </header>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Products</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{products.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
              <CubeIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-emerald-500/30 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{statusCounts.active}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckBadgeIcon className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-amber-500/30 hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Inactive</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{statusCounts.inactive}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <PauseCircleIcon className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Directory */}
      <Card className="overflow-hidden rounded-xl border border-border">
        <CardHeader className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">Product Directory</CardTitle>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create product
            </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
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

      <ProductCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
        capabilities={baseCapabilities}
      />

      <ProductEditDialog
        open={Boolean(editingProduct)}
        product={editingProduct}
        onOpenChange={(open) => {
          if (!open) setEditingProduct(null);
        }}
        onSubmit={handleEditSubmit}
        capabilities={baseCapabilities}
      />

      {/* Hidden mount for capability editor type safety */}
      <div className="hidden">
        <ProductCapabilitiesEditor capabilities={baseCapabilities} value={[]} onChange={() => {}} />
      </div>
    </div>
  );
}
