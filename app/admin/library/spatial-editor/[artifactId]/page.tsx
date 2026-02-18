import { SpatialEditorPage } from '@/features/admin/library/spatial-editor/SpatialEditorPage';

export default async function AdminSpatialEditorEdit({
  params,
}: {
  params: Promise<{ artifactId: string }>;
}) {
  const { artifactId } = await params;
  return <SpatialEditorPage artifactId={artifactId} />;
}
