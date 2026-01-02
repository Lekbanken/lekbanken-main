import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { assertTenantAdminOrSystem, isSystemAdmin } from '@/lib/utils/tenantAuth';
import type { Database, Json } from '@/types/supabase';
import { coachDiagramDocumentSchemaV1 } from '@/lib/validation/coachDiagramSchemaV1';

export const dynamic = 'force-dynamic';

type CoachDiagramExportsTable = {
  Row: {
    id: string;
    tenant_id: string | null;
    scope_type: string;
    schema_version: string;
    title: string;
    sport_type: string;
    field_template_id: string;
    exported_at: string;
    exported_by_user_id: string | null;
    exported_by_tool: string | null;
    document: Json;
    svg: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    tenant_id?: string | null;
    scope_type: string;
    schema_version: string;
    title: string;
    sport_type: string;
    field_template_id: string;
    exported_at: string;
    exported_by_user_id: string | null;
    exported_by_tool: string | null;
    document: Json;
    svg: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<CoachDiagramExportsTable['Insert']>;
  Relationships: [];
};

type DatabaseWithCoachDiagramExports = Database & {
  public: {
    Tables: Database['public']['Tables'] & {
      coach_diagram_exports: CoachDiagramExportsTable;
    };
  };
};

type MediaTable = Database['public']['Tables']['media'];

type DatabaseWithMediaAndCoachDiagrams = DatabaseWithCoachDiagramExports & {
  public: {
    Tables: DatabaseWithCoachDiagramExports['public']['Tables'] & {
      media: MediaTable;
    };
  };
};

type DiagramListRow = {
  id: string;
  tenant_id: string | null;
  scope_type: 'global' | 'tenant' | string;
  schema_version: string;
  title: string;
  sport_type: string;
  field_template_id: string;
  exported_at: string;
  exported_by_user_id: string | null;
  exported_by_tool: string | null;
  created_at: string;
  updated_at: string;
};

const scopeSchema = z.object({
  scopeType: z.enum(['global', 'tenant']),
  tenantId: z.string().uuid().nullable().optional(),
});

const createSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  scopeType: z.enum(['global', 'tenant']),
  exportedByTool: z.string().min(1).max(64).optional(),
  document: z.unknown(),
  svg: z.string().min(1),
});

async function requireAuth() {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { user, response: null };
}

function getAppUrlFromRequest(req: NextRequest): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url.replace(/\/$/, '');
  // Fallback: derive from incoming request (works in local dev without extra env).
  return new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const url = new URL(req.url);
  const scopeTypeRaw = url.searchParams.get('scopeType');
  const tenantIdRaw = url.searchParams.get('tenantId');

  const parsedScope = scopeSchema.safeParse({
    scopeType: scopeTypeRaw ?? 'tenant',
    tenantId: tenantIdRaw ? tenantIdRaw : null,
  });

  if (!parsedScope.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsedScope.error.flatten() }, { status: 400 });
  }

  const { scopeType, tenantId } = parsedScope.data;

  if (scopeType === 'global') {
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid query', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 });
    }
    const allowed = await assertTenantAdminOrSystem(tenantId, user);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithCoachDiagramExports>;

  let query = admin
    .from('coach_diagram_exports')
    .select('id,tenant_id,scope_type,schema_version,title,sport_type,field_template_id,exported_at,exported_by_user_id,exported_by_tool,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (scopeType === 'global') {
    query = query.is('tenant_id', null);
  } else {
    const tenantIdForQuery = tenantId ?? null;
    if (!tenantIdForQuery) {
      return NextResponse.json({ error: 'Invalid query', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 });
    }
    query = query.eq('tenant_id', tenantIdForQuery);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Failed to list diagrams', details: error.message ?? 'Unknown error' }, { status: 500 });
  }

  return NextResponse.json({ diagrams: (data ?? []) as DiagramListRow[] }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { tenantId: tenantIdRaw, scopeType, exportedByTool, document, svg } = parsed.data;
  const tenantId = tenantIdRaw ?? null;

  const docParsed = coachDiagramDocumentSchemaV1.safeParse(document);
  if (!docParsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: { document: docParsed.error.flatten() } }, { status: 400 });
  }

  const canonical = docParsed.data;

  if (scopeType === 'global') {
    if (tenantId !== null) {
      return NextResponse.json({ error: 'Invalid payload', details: { tenantId: ['Must be null for global scope'] } }, { status: 400 });
    }
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid payload', details: { tenantId: ['Required for tenant scope'] } }, { status: 400 });
    }
    const allowed = await assertTenantAdminOrSystem(tenantId, user);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const appUrl = getAppUrlFromRequest(req);

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithMediaAndCoachDiagrams>;

  // Use canonical document ID for stable identity (and reuse as media.id)
  const diagramId = canonical.id;

  // Upsert export row
  const nowIso = new Date().toISOString();

  const { error: upsertErr } = await admin
    .from('coach_diagram_exports')
    .upsert(
      {
        id: diagramId,
        tenant_id: tenantId,
        scope_type: scopeType,
        schema_version: String(canonical.schemaVersion),
        title: canonical.title,
        sport_type: canonical.sportType,
        field_template_id: canonical.fieldTemplateId,
        exported_at: nowIso,
        exported_by_user_id: user.id,
        exported_by_tool: exportedByTool ?? 'coach-diagram-builder',
        document: canonical as unknown as Json,
        svg,
        updated_at: nowIso,
      },
      { onConflict: 'id' },
    );

  if (upsertErr) {
    return NextResponse.json({ error: 'Failed to save diagram', details: upsertErr.message ?? 'Unknown error' }, { status: 500 });
  }

  // Ensure there is a matching media row (so games can reference it via game_media -> media)
  const mediaUrl = `${appUrl}/api/coach-diagrams/${diagramId}/svg`;

  const { error: mediaErr } = await admin
    .from('media')
    .upsert(
      {
        id: diagramId,
        name: canonical.title,
        type: 'diagram' as unknown as Database['public']['Enums']['media_type_enum'],
        url: mediaUrl,
        alt_text: canonical.title,
        tenant_id: tenantId,
        metadata: { kind: 'coach_diagram', schemaVersion: 1 } as unknown as Json,
      },
      { onConflict: 'id' },
    );

  if (mediaErr) {
    return NextResponse.json({ error: 'Failed to upsert media row', details: mediaErr.message ?? 'Unknown error' }, { status: 500 });
  }

  return NextResponse.json({ id: diagramId }, { status: 201 });
}
