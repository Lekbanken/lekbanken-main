import { redirect } from 'next/navigation';

// Redirect sandbox route → production admin route (Fas 2 migration)
export default async function SpatialEditorRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const artifactId = params?.artifact;
  if (artifactId) {
    redirect(`/admin/library/spatial-editor/${artifactId}`);
  }
  redirect('/admin/library/spatial-editor/new');
}
