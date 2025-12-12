'use client';

import { useMemo, useState } from "react";
import {
  SparklesIcon,
  PlusIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from "@/components/admin/shared";
import { useRbac } from "@/features/admin/shared/hooks/useRbac";
import { mockAchievements, themes } from "./data";
import type { AchievementItem, AchievementFilters, AchievementTheme } from "./types";
import { normalizeIconConfig } from "./icon-utils";
import { AchievementLibraryGrid } from "./components/AchievementLibraryGrid";
import { AchievementEditor } from "./editor/AchievementEditor";

export function AchievementAdminPage() {
  const { can } = useRbac();

  // RBAC permissions
  const _canViewAchievements = can('admin.achievements.list');
  const canCreateAchievement = can('admin.achievements.create');
  const _canEditAchievement = can('admin.achievements.edit');

  const [achievements, setAchievements] = useState<AchievementItem[]>(
    mockAchievements.map((a) => ({ ...a, icon: normalizeIconConfig(a.icon) })),
  );
  const [filters, setFilters] = useState<AchievementFilters>({ search: "", theme: "all", sort: "recent" });
  const [editing, setEditing] = useState<AchievementItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    const query = filters.search.toLowerCase();
    const bySearch = achievements.filter((ach) =>
      [
        ach.title,
        ach.subtitle ?? "",
        ach.icon.symbol?.id ?? "",
        ...(ach.icon.backgrounds?.map((b) => b.id) ?? []),
        ...(ach.icon.foregrounds?.map((f) => f.id) ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
    const byTheme = filters.theme === "all" ? bySearch : bySearch.filter((ach) => ach.icon.themeId === filters.theme);
    const sorted = [...byTheme].sort((a, b) => {
      if (filters.sort === "name") return a.title.localeCompare(b.title);
      return (b.rewardCoins ?? 0) - (a.rewardCoins ?? 0);
    });
    return sorted;
  }, [achievements, filters]);

  const handleSave = (item: AchievementItem) => {
    setAchievements((prev) => {
      const exists = prev.find((a) => a.id === item.id);
      if (exists) {
        return prev.map((a) => (a.id === item.id ? { ...item, version: (a.version ?? 1) + 1 } : a));
      }
      return [{ ...item, id: `achv-${Date.now()}`, version: 1, status: "draft" }, ...prev];
    });
    setEditing(null);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditing({
      id: `temp-${Date.now()}`,
      title: "",
      subtitle: "",
      rewardCoins: 0,
      icon: normalizeIconConfig({
        mode: "theme",
        themeId: themes[0]?.id ?? "gold",
        size: "lg",
        // Smart defaults: Start with a circle base for immediate visual feedback
        base: { id: "base_circle" },
        symbol: null,
        backgrounds: [],
        foregrounds: [],
      }),
      profileFrameSync: { enabled: false },
      publishedRoles: [],
      status: "draft",
      version: 1,
    });
    setIsCreating(true);
  };

  const handleEdit = (item: AchievementItem) => {
    setEditing({ ...item, icon: normalizeIconConfig(item.icon) });
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setIsCreating(false);
  };

  const themeMap = useMemo<Record<string, AchievementTheme>>(
    () => Object.fromEntries(themes.map((t) => [t.id, t])),
    [],
  );

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: 'Startsida', href: '/admin' },
          { label: 'Achievements' },
        ]}
      />

      <AdminPageHeader
        icon={<SparklesIcon className="h-6 w-6" />}
        title="Achievements"
        description="Bygg skiktade badges, tilldela teman och hantera belöningar"
        actions={
          canCreateAchievement && (
            <Button onClick={handleCreate} className="gap-2 shadow-sm">
              <PlusIcon className="h-4 w-4" />
              Skapa Achievement
            </Button>
          )
        }
      />

      {/* Badge Library Section */}
      <section>
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Squares2X2Icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Badge Library</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filtered.length} achievement{filtered.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" size="sm">
                  {achievements.filter(a => a.status === 'published').length} published
                </Badge>
                <Badge variant="outline" size="sm">
                  {achievements.filter(a => a.status === 'draft').length} drafts
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <AchievementLibraryGrid
              achievements={filtered}
              themes={themeMap}
              filters={filters}
              onFiltersChange={setFilters}
              onEdit={handleEdit}
              onCreate={handleCreate}
              selectedId={editing?.id}
            />
          </CardContent>
        </Card>
      </section>

      {/* Badge Builder Section */}
      <section>
        <Card className="border-border/50 overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SparklesIcon className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {isCreating ? 'Create New Badge' : editing ? 'Edit Badge' : 'Badge Builder'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editing ? `Editing: ${editing.title || 'Untitled'}` : 'Visual badge construction and metadata'}
                  </p>
                </div>
              </div>
              {editing && (
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={editing.status === 'published' ? 'success' : 'secondary'}
                    size="sm"
                    dot
                  >
                    {editing.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                  {editing.version && (
                    <Badge variant="outline" size="sm">
                      v{editing.version}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {editing ? (
              <AchievementEditor
                value={editing}
                themes={themes}
                onChange={handleSave}
                onCancel={handleCancel}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-primary">
                  <SparklesIcon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Select or create an achievement
                </h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Choose a badge from the library above or create a new one to start building its layers, colors, and metadata.
                </p>
                <Button onClick={handleCreate} className="mt-6 gap-2">
                  <PlusIcon className="h-4 w-4" />
                  Create Achievement
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AdminPageLayout>
  );
}
