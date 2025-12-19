'use client';

import type { MouseEvent } from "react";
import { CubeIcon, KeyIcon } from "@heroicons/react/24/outline";
import { SkeletonTable } from "@/components/ui";
import type { ProductAdminItem, ProductStatus} from "../types";
import { statusLabels } from "../types";
import { ProductRowActions } from "./ProductRowActions";

type ProductTableProps = {
  products: ProductAdminItem[];
  isLoading: boolean;
  searchQuery?: string;
  onEdit: (product: ProductAdminItem) => void;
  onStatusChange: (productId: string, status: ProductStatus) => void;
  onRemove: (productId: string) => void;
};

const categoryStyles: Record<string, string> = {
  platform: "bg-primary/10 text-primary",
  addon: "bg-accent/10 text-accent",
  bundle: "bg-amber-500/10 text-amber-600",
};

const categoryLabels: Record<string, string> = {
  platform: "Platform",
  addon: "Add-on",
  bundle: "Bundle",
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ProductTable({
  products,
  isLoading,
  searchQuery,
  onEdit,
  onStatusChange,
  onRemove,
}: ProductTableProps) {
  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, product: ProductAdminItem) => {
    if ((event.target as HTMLElement).closest("[data-no-row-click]")) return;
    onEdit(product);
  };

  if (isLoading) {
    return <SkeletonTable rows={6} columns={7} />;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <CubeIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {searchQuery ? "No products found" : "No products yet"}
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {searchQuery
            ? "Try adjusting your search or filters."
            : "Create your first product to define capabilities and licensing."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Category
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Purpose
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Capabilities
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Created
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {products.map((product) => (
            <tr
              key={product.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={(event) => handleRowClick(event, product)}
            >
              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <CubeIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{product.name}</p>
                    {product.description && (
                      <p className="max-w-xs text-sm text-muted-foreground line-clamp-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyles[product.category] || "bg-muted text-muted-foreground"}`}>
                  {categoryLabels[product.category] || product.category}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                {product.purposeName || "—"}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${product.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span className="text-sm text-muted-foreground">
                    {statusLabels[product.status]}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <button
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                  data-no-row-click
                >
                  <KeyIcon className="h-4 w-4" />
                  {product.capabilities?.length ?? 0}
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                {formatDate(product.createdAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right" data-no-row-click>
                <ProductRowActions
                  product={product}
                  onEdit={() => onEdit(product)}
                  onStatusChange={onStatusChange}
                  onRemove={onRemove}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
