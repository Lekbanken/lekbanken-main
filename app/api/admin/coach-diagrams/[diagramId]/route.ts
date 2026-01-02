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
  Update: {
    id?: string;
    tenant_id?: string | null;
    scope_type?: string;
    schema_version?: string;
    title?: string;
    sport_type?: string;
    field_template_id?: string;
    exported_at?: string;
    exported_by_user_id?: string | null;
    exported_by_tool?: string | null;
    document?: Json;
    svg?: string;
    created_at?: string;
    updated_at?: string;
  };
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

type CoachDiagramDocumentV1 = z.infer<typeof coachDiagramDocumentSchemaV1>;
type MediaType = Database['public']['Enums']['media_type_enum'] | 'diagram';

const updateSchema = z.object({
  tenantId: z.string().uuid().nullable().optional(),
  scopeType: z.enum(['global', 'tenant']).optional(),
  exportedByTool: z.string().min(1).max(64).optional(),
  document: z.unknown().optional(),
  svg: z.string().min(1).optional(),
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

function getAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ diagramId: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { diagramId } = await params;

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithCoachDiagramExports>;

  const { data, error } = await admin
    .from('coach_diagram_exports')
    .select('*')
    .eq('id', diagramId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const scopeType = (data.scope_type as string) === 'global' ? 'global' : 'tenant';
  const tenantId = (data.tenant_id as string | null) ?? null;

  if (scopeType === 'global') {
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const allowed = await assertTenantAdminOrSystem(tenantId, user);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ diagram: data }, { status: 200 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ diagramId: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { diagramId } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithMediaAndCoachDiagrams>;

  const { data: existing, error: getErr } = await admin
    .from('coach_diagram_exports')
    .select('id, tenant_id, scope_type')
    .eq('id', diagramId)
    .single();

  if (getErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const existingScopeType = (existing.scope_type as string) === 'global' ? 'global' : 'tenant';
  const existingTenantId = (existing.tenant_id as string | null) ?? null;

  // Authorization based on existing row (no scope escalations via PUT)
  if (existingScopeType === 'global') {
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!existingTenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const allowed = await assertTenantAdminOrSystem(existingTenantId, user);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nextDocument = parsed.data.document;
  const nextSvg = parsed.data.svg;

  let canonicalDoc: CoachDiagramDocumentV1 | null = null;
  if (nextDocument !== undefined) {
    const docParsed = coachDiagramDocumentSchemaV1.safeParse(nextDocument);
    if (!docParsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: { document: docParsed.error.flatten() } }, { status: 400 });
    }
    if (docParsed.data.id !== diagramId) {
      return NextResponse.json({ error: 'Invalid payload', details: { document: { id: ['Must match diagramId'] } } }, { status: 400 });
    }
    canonicalDoc = docParsed.data;
  }

  const nowIso = new Date().toISOString();

  const patch: CoachDiagramExportsTable['Update'] = {
    exported_at: nowIso,
    exported_by_user_id: user.id,
    exported_by_tool: parsed.data.exportedByTool ?? 'coach-diagram-builder',
    updated_at: nowIso,
  };

  if (canonicalDoc) {
    patch.schema_version = String(canonicalDoc.schemaVersion);
    patch.title = String(canonicalDoc.title ?? '');
    patch.sport_type = String(canonicalDoc.sportType ?? 'custom');
    patch.field_template_id = String(canonicalDoc.fieldTemplateId ?? '');
    patch.document = canonicalDoc as unknown as Json;
  }
  if (nextSvg !== undefined) patch.svg = nextSvg;

  const { error: updErr } = await admin
    .from('coach_diagram_exports')
    .update(patch)
    .eq('id', diagramId);

  if (updErr) {
    return NextResponse.json({ error: 'Failed to update diagram', details: updErr.message ?? 'Unknown error' }, { status: 500 });
  }

  // Keep media row in sync (title + url)
  const appUrl = getAppUrl();
  if (appUrl) {
    const mediaUrl = `${appUrl}/api/coach-diagrams/${diagramId}/svg`;
    const title = canonicalDoc ? String(canonicalDoc.title ?? '') : undefined;

    type MediaUpdate = Omit<MediaTable['Update'], 'type'> & { type?: MediaType };
    const mediaUpdate: MediaUpdate = {
      name: title,
      alt_text: title,
      url: mediaUrl,
      type: 'diagram',
    };

    await admin
      .from('media')
      .update(mediaUpdate as unknown as MediaTable['Update'])
      .eq('id', diagramId);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ diagramId: string }> }) {
  const { user, response } = await requireAuth();
  if (response) return response;

  const { diagramId } = await params;

  const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithMediaAndCoachDiagrams>;

  const { data: existing, error: getErr } = await admin
    .from('coach_diagram_exports')
    .select('id, tenant_id, scope_type')
    .eq('id', diagramId)
    .single();

  if (getErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const scopeType = (existing.scope_type as string) === 'global' ? 'global' : 'tenant';
  const tenantId = (existing.tenant_id as string | null) ?? null;

  if (scopeType === 'global') {
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!tenantId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const allowed = await assertTenantAdminOrSystem(tenantId, user);
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Best-effort: delete media row too. (FKs via game_media may prevent deletion.)
  await admin.from('media').delete().eq('id', diagramId);

  const { error: delErr } = await admin.from('coach_diagram_exports').delete().eq('id', diagramId);
  if (delErr) {
    return NextResponse.json({ error: 'Failed to delete diagram', details: delErr.message ?? 'Unknown error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
