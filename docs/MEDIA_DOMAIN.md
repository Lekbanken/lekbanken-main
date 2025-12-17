# Media Domain Documentation

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- DB schema:
  - `supabase/migrations/20251208090000_games_translations_media.sql` (game_media + translations)
  - `supabase/migrations/20251210120000_media_domain_enhancements.sql` (tenant isolation + templates + AI generations + RLS)
  - `supabase/migrations/20251210120100_achievements_media_migration.sql` (achievements icon_media_id)
- API:
  - `app/api/media/route.ts`
  - `app/api/media/[mediaId]/route.ts`
  - `app/api/media/upload/route.ts`
  - `app/api/media/upload/confirm/route.ts`
  - `app/api/media/templates/route.ts`
  - `app/api/media/templates/[templateId]/route.ts`
  - `app/api/media/fallback/route.ts`
- UI:
  - `components/ui/media-picker.tsx`
  - `features/admin/media/*`
  - `app/admin/media/page.tsx`
- Services:
  - `lib/services/mediaFallback.server.ts`
  - `lib/services/imageOptimization.server.ts`

## Validation checklist

- `media`, `media_templates`, `media_ai_generations` exist in `types/supabase.ts` and match the migrations.
- API routes exist under `app/api/media/*` and match the endpoint list below.
- Upload flow uses `createSignedUploadUrl` + `/api/media/upload/confirm`.
- Upload endpoint bucket allowlist matches code: `game-media`, `custom_utmarkelser`, `tenant-media`.
- Confirm endpoint uses `getPublicUrl` → bucket must allow public reads (eller byt till signed downloads).

## Overview

The Media Domain handles all image and visual asset management in Lekbanken, including game covers, achievement badges, tenant logos, and template images.

## Architecture

### Tables (canonical = DB + generated types)

För exakta kolumner: se migrations ovan + `types/supabase.ts`.

- `media`: central katalog av mediaobjekt (url, typ, tenant-scope, metadata). Obs: `media.game_id` finns historiskt men är markerat som deprecated.
- `game_media`: kopplar spel → media (cover/gallery, ordering).
- `media_templates`: mapping för standardbilder (product/purpose/sub-purpose) + priority + default.
- `media_ai_generations`: framtida spårning för AI-genererat media.

## API Endpoints

### Media CRUD
- `GET /api/media` - List media with filters (type, tenantId)
  - Query params supported by current implementation: `tenantId`, `type`, `limit`, `offset`
  - Special case: when `type=template` and `mainPurposeId` is provided, endpointen returnerar media via `media_templates` för det syftet.
- `POST /api/media` - Create media record
- `GET /api/media/[mediaId]` - Get single media
- `PATCH /api/media/[mediaId]` - Update media
- `DELETE /api/media/[mediaId]` - Delete media

### Upload Flow
1. `POST /api/media/upload` - Get signed upload URL
2. `PUT [signed URL]` - Upload file to Supabase Storage
3. `POST /api/media/upload/confirm` - Resolve URL (via `getPublicUrl`)
4. `POST /api/media` - Create media record

### Fallback System
- `GET /api/media/fallback?productId=X&mainPurposeId=Y&subPurposeId=Z`
  - Returns best matching template image
  - Hierarchy: sub-purpose → purpose+product → purpose → product → global

### Template Management
- `GET /api/media/templates` - List all mappings
- `POST /api/media/templates` - Create mapping
- `DELETE /api/media/templates/[templateId]` - Delete mapping

## Fallback Chain

When a game has no explicit cover image:

1. **Sub-purpose template** - If game has sub-purpose, use its template
2. **Purpose + Product template** - Combination match
3. **Purpose template** - Main purpose only
4. **Product template** - Product only
5. **Global default** - Marked with `is_default=true`

## Storage Buckets

### Supabase Storage
- `tenant-media` - Tenant-uppladdningar (används av nuvarande Admin UI: MediaPicker + TenantMediaBank)
- `custom_utmarkelser` - Achievement assets (bucket förekommer i admin assets-kod)
- `game-media` - Allowlistat i upload-API men används inte av nuvarande UI (reserverat/framtida)

Note: The current confirm endpoint uses `getPublicUrl`. If a bucket is intended to be private, the download flow should use signed URLs instead.

## UI Components

### MediaPicker
Reusable component for selecting/uploading media.

```tsx
<MediaPicker
  value={selectedMediaId}
  onSelect={(mediaId, url) => setMedia({ id: mediaId, url })}
  tenantId={tenantId}
  allowUpload={true}
  allowTemplate={true}
/>
```

Features:
- Library tab (tenant uploads)
- Templates tab (standard images)
- Upload tab (direct file upload)
- Grid preview with selection

### Admin Pages
- Admin UI exists under `app/admin/media/page.tsx` and uses:
  - `features/admin/media/TenantMediaBank.tsx`
  - `features/admin/media/StandardImagesManager.tsx`

## Image Optimization

### Service: `imageOptimization.server.ts`

```typescript
import { optimizeImage, generateResponsiveSizes } from '@/lib/services/imageOptimization.server'

// Optimize single image
const webpBuffer = await optimizeImage(inputBuffer, {
  format: 'webp',
  quality: 80,
  width: 1024,
  height: 1024,
  fit: 'cover',
})

// Generate responsive sizes
const variants = await generateResponsiveSizes(inputBuffer, ['webp', 'avif'])
// Returns: sm (256px), md (512px), lg (1024px), xl (2048px)
```

### Metadata Storage
Store responsive variants in `media.metadata`:

```json
{
  "responsive": {
    "sm": { "url": "...", "width": 256, "height": 256, "format": "webp" },
    "md": { "url": "...", "width": 512, "height": 512, "format": "webp" }
  },
  "alt_text_i18n": {
    "sv": "Svensk alt-text",
    "en": "English alt-text"
  }
}
```

## RLS Policies

Källa: `supabase/migrations/20251210120000_media_domain_enhancements.sql`.

- `media`: tenant-isolerat via `get_user_tenant_ids()` + global media (tenant_id null) + koppling via `game_media`.
- `media_templates`: läsbar för alla, hanteras av system_admin.
- `media_ai_generations`: läs/skriv för eget user/tenant-scope.

## Tenant Isolation

Media can be:
1. **Global** (`tenant_id IS NULL`) - Visible to all, editable by system_admin
2. **Tenant-scoped** (`tenant_id` set) - Only visible/editable by tenant members

Games can link to both global and tenant media via `game_media` junction.

## Migration from Old System

### Achievements
Old: `achievements.icon_url` (text)
New: `achievements.icon_media_id` (FK)

Migration steps:
1. Upload existing icons to `media` table
2. Update `icon_media_id` references
3. Deprecate `icon_url` field

### Games
Old: `media.game_id` (direct FK, 1:1 assumption)
New: `game_media` junction (M:M with ordering)

Current state: Both exist (transitional)
Future: Remove `media.game_id` column

## Best Practices

### Upload Workflow
1. Validera filstorlek (API begränsar till 10MB via `/api/media/upload`)
2. Request signed URL with tenant/bucket info
3. Upload directly to Supabase Storage
4. Confirm upload and get public URL
5. Create `media` record with URL and metadata

Obs: Dimensionvalidering/format-validering finns som helper i `lib/services/imageOptimization.server.ts` men körs inte i upload-API i nuläget.

### Using Fallbacks
Always provide fallback parameters when displaying game covers:

Se `lib/services/mediaFallback.server.ts` och `GET /api/media/fallback` för hierarkin.

### Next.js Image Optimization
Use Next.js `Image` component for automatic optimization:

```tsx
<Image
  src={imageUrl}
  alt={altText}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

## Future Enhancements

### AI Generation
When `media.type = 'ai'`:
1. Store generation params in `media_ai_generations`
2. Track costs and credits
3. Support revision history
4. Allow regeneration with adjusted prompts

### CDN & Caching
- Configure Supabase Storage caching headers
- Consider Cloudflare Image Resizing for on-the-fly transforms
- Implement edge caching for frequently accessed images

### Analytics
Track:
- Media views per game/badge
- Upload frequency by tenant
- Storage usage by tenant
- Popular templates

## Troubleshooting

### Images not loading
1. Check Next.js `remotePatterns` in `next.config.ts`
2. Verify Supabase Storage bucket is public
3. Confirm RLS policies allow access

### Upload failing
1. Check file size limits
2. Verify Supabase Storage bucket exists
3. Confirm user has authentication token
4. Check bucket CORS settings

### Fallback not working
1. Ensure `media_templates` table has default entry
2. Verify `priority` values are set
3. Check RLS policies on `media_templates`

## Related Documentation
- [Achievements Asset Model](./ACHIEVEMENTS_ASSET_MODEL.md)
- [Games Domain](./DOMAIN_GAMES_TODO.md)
- [Tenant Domain](./DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md)
