import { CoachDiagramEditorPage } from '@/features/admin/library/coach-diagrams/CoachDiagramEditorPage';

export default async function AdminLibraryCoachDiagramEditor({
  params,
}: {
  params: Promise<{ diagramId: string }>;
}) {
  const { diagramId } = await params;
  return <CoachDiagramEditorPage diagramId={diagramId} />;
}
