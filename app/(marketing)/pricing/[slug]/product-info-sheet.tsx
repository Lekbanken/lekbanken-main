"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import type { ProductCard } from "../pricing-shared";

// =============================================================================
// ProductInfoSheet — a right-side drawer showing product details + buy CTA
// =============================================================================

type ProductInfoSheetProps = {
  product: ProductCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gradient: string;
  iconColor: string;
  hasBundleOption: boolean;
};

export default function ProductInfoSheet({
  product,
  open,
  onOpenChange,
  gradient,
  hasBundleOption,
}: ProductInfoSheetProps) {
  const t = useTranslations("marketing.pricing.productSheet");

  if (!product) return null;

  const checkoutHref = product.priceId
    ? `/checkout/start?product=${product.id}&price=${product.priceId}`
    : `/checkout/start?product=${product.id}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{product.name}</SheetTitle>
          {product.description && (
            <SheetDescription className="text-sm leading-relaxed">
              {product.description}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Product image */}
        {product.imageUrl && (
          <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted/30">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 80vw, 400px"
            />
          </div>
        )}

        {/* Price display */}
        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
          {product.price ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {product.price}
              </span>
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t("noPrice")}
            </p>
          )}
        </div>

        {/* Benefits */}
        <ul className="mt-6 space-y-2.5">
          <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
            {t("instantAccess")}
          </li>
          <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
            {t("cancelAnytime")}
          </li>
          <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
            {t("teamAccess")}
          </li>
        </ul>

        {/* Bundle upsell hint */}
        {hasBundleOption && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm font-medium text-foreground">
              {t("bundleHint")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("bundleHintDescription")}
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer CTA */}
        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
          <a
            href={checkoutHref}
            className={`flex w-full items-center justify-center rounded-xl bg-gradient-to-r ${gradient} px-5 py-3 text-base font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02]`}
          >
            {t("buyLicense")}
          </a>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
