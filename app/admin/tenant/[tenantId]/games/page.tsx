import { PuzzlePieceIcon } from "@heroicons/react/24/outline";
import { AdminPageHeader, AdminPageLayout, AdminEmptyState } from "@/components/admin/shared";

export default function TenantGamesPage() {
  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Spel"
        description="Välj vilka spel som ska vara tillgängliga för organisationen."
        icon={<PuzzlePieceIcon className="h-8 w-8 text-primary" />}
      />

      <AdminEmptyState
        icon={<PuzzlePieceIcon className="h-6 w-6" />}
        title="Inga spel konfigurerade"
        description="Denna sida kommer att lista spel, tillgänglighet och taggar per organisation."
      />
    </AdminPageLayout>
  );
}
