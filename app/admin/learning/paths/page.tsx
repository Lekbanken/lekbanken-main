'use client';

import { useState } from "react";
import {
  MapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO: Remove mock data when database is connected
const mockPaths = [
  {
    id: "1",
    name: "Lekledarutbildning Grundnivå",
    slug: "grundniva",
    description: "Komplett grundutbildning för nya lekledare.",
    status: "published",
    is_onboarding_default: true,
    courses: [
      { id: "1", title: "Introduktion till Lekbanken", order: 1 },
      { id: "2", title: "Säkerhet och Trygghet", order: 2 },
    ],
    _count: {
      enrollments: 45,
      completions: 38,
    },
  },
  {
    id: "2",
    name: "Fördjupad Pedagogik",
    slug: "fordjupad-pedagogik",
    description: "Avancerad utbildning för erfarna lekledare.",
    status: "draft",
    is_onboarding_default: false,
    courses: [
      { id: "3", title: "Avancerade Lektekniker", order: 1 },
    ],
    _count: {
      enrollments: 0,
      completions: 0,
    },
  },
];

const statusConfig = {
  draft: { label: "Utkast", variant: "outline" as const },
  published: { label: "Publicerad", variant: "default" as const },
  archived: { label: "Arkiverad", variant: "secondary" as const },
};

export default function AdminPathsPage() {
  const [paths] = useState(mockPaths);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Utbildning", href: "/admin/learning" },
          { label: "Lärstigar", href: "/admin/learning/paths" },
        ]}
      />

      <AdminPageHeader
        title="Lärstigar"
        description="Bygg utbildningsvägar med ordnade kurser"
        icon={<MapIcon className="h-8 w-8" />}
        actions={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Ny lärstig
          </Button>
        }
      />

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{paths.length}</p>
            <p className="text-sm text-muted-foreground">Lärstigar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {paths.reduce((sum, p) => sum + p._count.enrollments, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Aktiva deltagare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {paths.reduce((sum, p) => sum + p._count.completions, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Avklarade</p>
          </CardContent>
        </Card>
      </div>

      {/* Path Cards */}
      <div className="mt-6 space-y-4">
        {paths.map((path) => {
          const statusInfo = statusConfig[path.status as keyof typeof statusConfig];
          return (
            <Card key={path.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                      <MapIcon className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{path.name}</CardTitle>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        {path.is_onboarding_default && (
                          <Badge variant="secondary">Onboarding</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" href={`/admin/learning/paths/${path.id}`}>
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Course flow */}
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
                  {path.courses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Inga kurser tillagda</p>
                  ) : (
                    path.courses.map((course, idx) => (
                      <div key={course.id} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-1.5 shadow-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium">{course.title}</span>
                        </div>
                        {idx < path.courses.length - 1 && (
                          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Stats */}
                <div className="mt-4 flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {path._count.enrollments} deltagare pågår
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground">
                      {path._count.completions} har slutfört
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state hint */}
      {paths.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">Inga lärstigar ännu</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Skapa din första lärstig för att organisera kurser i en sekvens.
            </p>
            <Button className="mt-4">
              <PlusIcon className="mr-2 h-4 w-4" />
              Skapa lärstig
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}
