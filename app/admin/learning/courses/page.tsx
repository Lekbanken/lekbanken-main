'use client';

import { useState } from "react";
import {
  BookOpenIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// TODO: Remove mock data when database is connected
const mockCourses = [
  {
    id: "1",
    title: "Introduktion till Lekbanken",
    slug: "intro-lekbanken",
    description: "Lär dig grunderna i hur Lekbanken fungerar.",
    status: "published",
    version: 1,
    estimated_duration_minutes: 15,
    pass_threshold: 80,
    max_attempts: 3,
    created_at: "2024-12-01T10:00:00Z",
    updated_at: "2024-12-15T14:30:00Z",
    _count: {
      attempts: 47,
      completions: 41,
    },
  },
  {
    id: "2",
    title: "Säkerhet och Trygghet",
    slug: "sakerhet-trygghet",
    description: "Viktiga riktlinjer för en trygg lekmiljö.",
    status: "published",
    version: 2,
    estimated_duration_minutes: 20,
    pass_threshold: 90,
    max_attempts: 5,
    created_at: "2024-11-20T08:00:00Z",
    updated_at: "2025-01-02T09:15:00Z",
    _count: {
      attempts: 32,
      completions: 28,
    },
  },
  {
    id: "3",
    title: "Avancerade Lektekniker",
    slug: "avancerade-lektekniker",
    description: "Fördjupning i pedagogiska lekmetoder.",
    status: "draft",
    version: 1,
    estimated_duration_minutes: 30,
    pass_threshold: 75,
    max_attempts: null,
    created_at: "2025-01-03T16:00:00Z",
    updated_at: "2025-01-03T16:00:00Z",
    _count: {
      attempts: 0,
      completions: 0,
    },
  },
];

const statusConfig = {
  draft: { label: "Utkast", variant: "outline" as const, icon: ClockIcon },
  published: { label: "Publicerad", variant: "default" as const, icon: CheckCircleIcon },
  archived: { label: "Arkiverad", variant: "secondary" as const, icon: XCircleIcon },
};

export default function AdminCoursesPage() {
  const [courses] = useState(mockCourses);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Utbildning", href: "/admin/learning" },
          { label: "Kurser", href: "/admin/learning/courses" },
        ]}
      />

      <AdminPageHeader
        title="Kurser"
        description="Skapa och hantera utbildningskurser"
        icon={<BookOpenIcon className="h-8 w-8" />}
        actions={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Ny kurs
          </Button>
        }
      />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-sm text-muted-foreground">Totalt kurser</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {courses.filter((c) => c.status === "published").length}
            </p>
            <p className="text-sm text-muted-foreground">Publicerade</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {courses.reduce((sum, c) => sum + c._count.attempts, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Totalt försök</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {Math.round(
                (courses.reduce((sum, c) => sum + c._count.completions, 0) /
                  Math.max(courses.reduce((sum, c) => sum + c._count.attempts, 0), 1)) *
                  100
              )}
              %
            </p>
            <p className="text-sm text-muted-foreground">Godkänt-rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses Table */}
      <Card className="mt-6">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kurs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Tid</TableHead>
                <TableHead>Godkänt</TableHead>
                <TableHead>Försök</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => {
                const statusInfo = statusConfig[course.status as keyof typeof statusConfig];
                const StatusIcon = statusInfo.icon;
                return (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{course.title}</p>
                        <p className="text-sm text-muted-foreground">{course.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>v{course.version}</TableCell>
                    <TableCell>{course.estimated_duration_minutes} min</TableCell>
                    <TableCell>{course.pass_threshold}%</TableCell>
                    <TableCell>
                      <span className="text-green-600">{course._count.completions}</span>
                      <span className="text-muted-foreground"> / {course._count.attempts}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" href={`/admin/learning/courses/${course.id}`}>
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
