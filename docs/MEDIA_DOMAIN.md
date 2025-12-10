# Media Domain Documentation

## Overview

The Media Domain handles all image and visual asset management in Lekbanken, including game covers, achievement badges, tenant logos, and template images.

## Architecture

### Core Tables

#### `media`
Main media storage table with tenant isolation and metadata support.

```sql
- id: uuid (PK)
- name: text (required)
- type: enum('template', 'upload', 'ai')
- url: text (required)
- alt_text: text (optional)
- tenant_id: uuid (FK to tenants, optional)
- metadata: jsonb (responsive sizes, alt-text i18n, etc.)
- created_at: timestamptz
```

#### `media_templates`
Standard images mapped to product + purpose combinations.

```sql
- id: uuid (PK)
- template_key: text (unique)
- name: text
- product_id: uuid (FK, optional)
- main_purpose_id: uuid (FK, optional)
- sub_purpose_id: uuid (FK, optional)
- media_id: uuid (FK to media, required)
- priority: integer (for ordering)
- is_default: boolean (global fallback)
```

#### `game_media`
Junction table linking games to media with ordering and classification.

```sql
- id: uuid (PK)
- game_id: uuid (FK to games, required)
- media_id: uuid (FK to media, required)
- tenant_id: uuid (FK to tenants, optional)
- kind: enum('cover', 'gallery')
- position: integer
- alt_text: text
```

#### `media_ai_generations`
Tracking for AI-generated images (future use).

```sql
- id: uuid (PK)
- media_id: uuid (FK to media)
- tenant_id: uuid (FK to tenants, optional)
- user_id: uuid (FK to users, optional)
- prompt: text
- model: text
- parameters: jsonb
- status: text
```

## API Endpoints

### Media CRUD
- `GET /api/media` - List media with filters (type, tenantId)
- `POST /api/media` - Create media record
- `GET /api/media/:id` - Get single media
- `PATCH /api/media/:id` - Update media
- `DELETE /api/media/:id` - Delete media

### Upload Flow
1. `POST /api/media/upload` - Get signed upload URL
2. `PUT [signed URL]` - Upload file to Supabase Storage
3. `POST /api/media/upload/confirm` - Get public URL
4. `POST /api/media` - Create media record

### Fallback System
- `GET /api/media/fallback?productId=X&mainPurposeId=Y&subPurposeId=Z`
  - Returns best matching template image
  - Hierarchy: sub-purpose → purpose+product → purpose → product → global

## Fallback Chain

When a game has no explicit cover image:

1. **Sub-purpose template** - If game has sub-purpose, use its template
2. **Purpose + Product template** - Combination match
3. **Purpose template** - Main purpose only
4. **Product template** - Product only
5. **Global default** - Marked with `is_default=true`

## Storage Buckets

### Supabase Storage
- `game-media` - Game cover images (public)
- `custom_utmarkelser` - Achievement badge assets (public)
- `tenant-media` - Tenant-uploaded private media

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

### media table
- **SELECT**: Global media OR tenant member OR linked to accessible game
- **INSERT**: Authenticated users for global/own tenant media
- **UPDATE**: Tenant members for own tenant media, system_admin for global
- **DELETE**: Same as UPDATE

### media_templates table
- **SELECT**: Public read access
- **ALL**: system_admin only

### media_ai_generations table
- **SELECT**: Own tenant or own user
- **INSERT**: Own user, optionally for own tenant
- **UPDATE**: Own user only

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
1. Validate file size (< 10MB) and dimensions (< 4096px)
2. Request signed URL with tenant/bucket info
3. Upload directly to Supabase Storage
4. Confirm upload and get public URL
5. Create `media` record with URL and metadata

### Using Fallbacks
Always provide fallback parameters when displaying game covers:

```typescript
const fallback = await getGameCoverWithFallback({
  gameId: game.id,
  productId: game.product_id,
  mainPurposeId: game.main_purpose_id,
  subPurposeId: game.sub_purpose_id,
})

const imageUrl = fallback.url || '/default-game-cover.png'
```

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
