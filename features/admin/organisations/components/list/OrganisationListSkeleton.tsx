"use client";

import { Card, CardContent, Skeleton } from "@/components/ui";

type OrganisationListSkeletonProps = {
  rows?: number;
};

export function OrganisationListSkeleton({ rows = 3 }: OrganisationListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={`org-skeleton-${index}`} className="border-border/60">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <Skeleton className="h-8 w-10 rounded-lg" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((__, previewIndex) => (
                  <div key={`org-skeleton-preview-${previewIndex}`} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
