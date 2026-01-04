'use client';

import { useState } from "react";
import {
  ShieldCheckIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  UserGroupIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// TODO: Remove mock data when database is connected
const mockRequirements = [
  {
    id: "1",
    requirement_type: "game_access",
    target_ref: "game:outdoor-relay",
    target_display: "Utomhusstafett",
    course_title: "Säkerhet och Trygghet",
    course_id: "2",
    is_active: true,
    created_at: "2025-01-02T10:00:00Z",
  },
  {
    id: "2",
    requirement_type: "role_requirement",
    target_ref: "role:assistant-leader",
    target_display: "Biträdande lekledare",
    course_title: "Introduktion till Lekbanken",
    course_id: "1",
    is_active: true,
    created_at: "2025-01-01T08:00:00Z",
  },
  {
    id: "3",
    requirement_type: "activity_gate",
    target_ref: "activity:create-session",
    target_display: "Skapa lekpass",
    course_title: "Introduktion till Lekbanken",
    course_id: "1",
    is_active: false,
    created_at: "2024-12-28T14:30:00Z",
  },
];

const typeConfig = {
  game_access: { label: "Spelåtkomst", icon: PuzzlePieceIcon, color: "text-purple-500 bg-purple-500/10" },
  role_requirement: { label: "Rollkrav", icon: UserGroupIcon, color: "text-blue-500 bg-blue-500/10" },
  activity_gate: { label: "Aktivitetsgrind", icon: PlayIcon, color: "text-green-500 bg-green-500/10" },
};

export default function AdminRequirementsPage() {
  const [requirements, setRequirements] = useState(mockRequirements);

  const toggleActive = (id: string) => {
    setRequirements((prev) =>
      prev.map((r) => (r.id === id ? { ...r, is_active: !r.is_active } : r))
    );
  };

  const deleteRequirement = (id: string) => {
    if (confirm("Är du säker på att du vill ta bort detta krav?")) {
      setRequirements((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Utbildning", href: "/admin/learning" },
          { label: "Krav & Grind", href: "/admin/learning/requirements" },
        ]}
      />

      <AdminPageHeader
        title="Krav & Grind"
        description="Konfigurera vilka kurser som krävs för aktiviteter och roller"
        icon={<ShieldCheckIcon className="h-8 w-8" />}
        actions={
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Nytt krav
          </Button>
        }
      />

      {/* Info card */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <ShieldCheckIcon className="h-5 w-5 shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Hur fungerar krav?</p>
              <p className="mt-1 text-muted-foreground">
                Krav blockerar användare från att utföra vissa aktiviteter eller ta roller tills de har slutfört
                specifika kurser. När en användare försöker göra något som kräver en kurs visas en modal med
                information om vilka kurser som behöver slutföras.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{requirements.length}</p>
            <p className="text-sm text-muted-foreground">Totalt krav</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-600">
              {requirements.filter((r) => r.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Aktiva</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">
              {requirements.filter((r) => !r.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Inaktiva</p>
          </CardContent>
        </Card>
      </div>

      {/* Requirements Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Alla krav</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Mål</TableHead>
                <TableHead>Krävd kurs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req) => {
                const typeInfo = typeConfig[req.requirement_type as keyof typeof typeConfig];
                const TypeIcon = typeInfo.icon;
                return (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${typeInfo.color}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{typeInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.target_display}</p>
                        <p className="text-xs text-muted-foreground font-mono">{req.target_ref}</p>
                      </div>
                    </TableCell>
                    <TableCell>{req.course_title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={req.is_active}
                          onCheckedChange={() => toggleActive(req.id)}
                        />
                        <Badge variant={req.is_active ? "default" : "outline"}>
                          {req.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRequirement(req.id)}
                        >
                          <TrashIcon className="h-4 w-4 text-destructive" />
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

      {/* Empty state */}
      {requirements.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheckIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">Inga krav konfigurerade</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Skapa krav för att kräva att användare slutför kurser innan de kan utföra vissa aktiviteter.
            </p>
            <Button className="mt-4">
              <PlusIcon className="mr-2 h-4 w-4" />
              Skapa första kravet
            </Button>
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}
