"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { CategoryHub } from "./category-hub";
import type { CategoryHubItem } from "./category-hub";

// =============================================================================
// Skeleton (matches CategoryCard layout to avoid CLS)
// =============================================================================

function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-pulse">
      {/* Header gradient placeholder */}
      <div className="h-[76px] bg-muted" />
      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex gap-4">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="mt-4 h-8 w-28 rounded bg-muted" />
        <div className="mt-5 flex flex-col gap-2">
          <div className="h-10 rounded-lg bg-muted" />
          <div className="h-10 rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

function CategoryHubSkeleton() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-9 w-80 rounded bg-muted animate-pulse" />
          <div className="h-5 w-96 max-w-full rounded bg-muted animate-pulse" />
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Fallback CTA (shown on fetch error)
// =============================================================================

function FallbackCta() {
  const t = useTranslations("marketing");
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("categoryHub.title")}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          {t("categoryHub.subtitle")}
        </p>
        <div className="mt-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
          >
            {t("categoryHub.cta.viewAll")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Loader (client-side fetch with skeleton)
// =============================================================================

/**
 * Client-side wrapper that fetches categories from the public API
 * and renders the CategoryHub. Shows a matching skeleton during load
 * to prevent CLS. Falls back to a CTA on error.
 */
export function CategoryHubLoader() {
  const [categories, setCategories] = useState<CategoryHubItem[]>([]);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    // Route handler has revalidate=300; client fetch relies on that server-side cache.
    fetch("/api/public/categories?currency=SEK")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCategories(data.categories ?? []);
          setState("loaded");
        }
      })
      .catch((err) => {
        console.error("[category-hub] fetch error", err);
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") return <CategoryHubSkeleton />;
  if (state === "error") return <FallbackCta />;
  if (categories.length === 0) return null;

  return <CategoryHub categories={categories} />;
}
