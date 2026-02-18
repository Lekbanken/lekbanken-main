-- Spatial Artifacts – preview image storage
-- Public bucket for artifact preview thumbnails (low-res PNGs).
-- Path convention: {artifactId}/preview.png
--   Extensible later: {artifactId}/preview@2x.png, /thumb.png, /export.pdf

-- 1) Create bucket
insert into storage.buckets (id, name, public)
values ('spatial-previews', 'spatial-previews', true)
on conflict (id) do nothing;

-- 2) Policies
-- Ownership is enforced by joining against spatial_artifacts:
--   The first path segment (foldername[1]) must be a UUID matching an artifact
--   that the user either created or belongs to their tenant.

-- Anyone can read (public bucket – previews are non-sensitive thumbnails)
drop policy if exists "spatial_previews_public_read" on storage.objects;
create policy "spatial_previews_public_read" on storage.objects
  for select
  using (bucket_id = 'spatial-previews');

-- INSERT: user must own the artifact (creator or tenant member)
drop policy if exists "spatial_previews_auth_insert" on storage.objects;
create policy "spatial_previews_auth_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'spatial-previews'
    and exists (
      select 1 from public.spatial_artifacts sa
      where sa.id::text = (storage.foldername(name))[1]
        and (
          sa.created_by = auth.uid()
          or sa.tenant_id = any(get_user_tenant_ids())
        )
    )
  );

-- UPDATE: same ownership check
drop policy if exists "spatial_previews_auth_update" on storage.objects;
create policy "spatial_previews_auth_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'spatial-previews'
    and exists (
      select 1 from public.spatial_artifacts sa
      where sa.id::text = (storage.foldername(name))[1]
        and (
          sa.created_by = auth.uid()
          or sa.tenant_id = any(get_user_tenant_ids())
        )
    )
  )
  with check (
    bucket_id = 'spatial-previews'
  );

-- DELETE: same ownership check
drop policy if exists "spatial_previews_auth_delete" on storage.objects;
create policy "spatial_previews_auth_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'spatial-previews'
    and exists (
      select 1 from public.spatial_artifacts sa
      where sa.id::text = (storage.foldername(name))[1]
        and (
          sa.created_by = auth.uid()
          or sa.tenant_id = any(get_user_tenant_ids())
        )
    )
  );
