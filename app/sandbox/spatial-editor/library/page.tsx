import { redirect } from 'next/navigation';

// Redirect sandbox route → production admin route (Fas 2 migration)
export default function SpatialLibraryRedirect() {
  redirect('/admin/library/spatial-editor');
}

