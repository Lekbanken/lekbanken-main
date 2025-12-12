import { PuzzlePieceIcon, PlusIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";
import { Button } from "@/components/ui/button";

export default function GamesAdminPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Spel (globalt)"
        description="Hantera spelkatalogen, kategorier och tillgänglighet."
        icon={<PuzzlePieceIcon className="h-8 w-8 text-primary" />}
        actions={
          <Button size="sm" variant="outline" className="gap-2" disabled>
            <PlusIcon className="h-4 w-4" />
            Lägg till spel
          </Button>
        }
      />

      <AdminEmptyState
        icon={<PuzzlePieceIcon className="h-6 w-6" />}
        title="Inga spel listade ännu"
        description="Denna sida kommer lista alla spel med status, taggar och tenant-tillgänglighet. Backendkoppling saknas ännu."
        action={{
          label: "Kommer snart",
          onClick: () => {},
          icon: <PlusIcon className="h-4 w-4" />,
        }}
      />
    </AdminPageLayout>
  );
}
