"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import type { ProductCard } from "../pricing-shared";
import ProductInfoSheet from "./product-info-sheet";

// =============================================================================
// ProductGrid — client wrapper for the product card grid.
// Replaces <Link> navigation with onClick → open Sheet modal.
// =============================================================================

type ProductGridProps = {
  products: ProductCard[];
  /** Category has a bundle — show "included in bundle" badge */
  hasBundleOption: boolean;
  /** Category visuals for icon fallback */
  iconKey: string | null;
  gradient: string;
  iconColor: string;
};

export default function ProductGrid({
  products,
  hasBundleOption,
  iconKey,
  gradient,
  iconColor,
}: ProductGridProps) {
  const t = useTranslations("marketing.pricing.categoryPage");
  const [selectedProduct, setSelectedProduct] = useState<ProductCard | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleCardClick(product: ProductCard) {
    setSelectedProduct(product);
    setSheetOpen(true);
  }

  // We import getCategoryVisuals for the placeholder icon — but since it
  // requires heroicons (not serialisable), we accept iconKey and render
  // a simple placeholder div when no image exists.

  return (
    <>
      <div className="grid grid-cols-1 gap-5 pb-20 lg:pb-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => handleCardClick(product)}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {/* Image or placeholder */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-muted-foreground/10" />
                </div>
              )}

              {/* "Included in bundle" badge */}
              {hasBundleOption && (
                <span className="absolute left-2 top-2 z-10 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm">
                  {t("includedInBundle")}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-4">
              <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              {product.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {product.description}
                </p>
              )}

              <div className="flex-1" />

              {/* Price + CTA row */}
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                {product.price ? (
                  <span className="text-sm font-bold text-foreground">
                    {product.price}
                  </span>
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    {t("noPrice")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors group-hover:text-primary/80">
                  {t("viewProduct")}
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Product info sheet (modal) */}
      <ProductInfoSheet
        product={selectedProduct}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        gradient={gradient}
        iconColor={iconColor}
        hasBundleOption={hasBundleOption}
      />
    </>
  );
}
