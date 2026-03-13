import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api/route-handler';
import { AuthError, requireTenantRole } from '@/lib/api/auth-guard';
import type { Database, Json } from '@/types/supabase';
import { coachDiagramDocumentSchemaV1 } from '@/lib/validation/coachDiagramSchemaV1';
import type { AuthContext } from '@/types/auth';

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

async function authorizeScope(
  auth: AuthContext,
  row: { tenant_id: string | null; scope_type: string },
) {
  const scopeType = (row.scope_type as string) === 'global' ? 'global' : 'tenant';
  const tenantId = (row.tenant_id as string | null) ?? null;

  if (scopeType === 'global') {
    if (auth.effectiveGlobalRole !== 'system_admin') {
      throw new AuthError('Forbidden', 403);
    }
  } else {
    if (!tenantId) throw new AuthError('Forbidden', 403);
    await requireTenantRole(['admin', 'owner'], tenantId);
  }
}

function getAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return null;
  return url.replace(/\/$/, '');
}

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithCoachDiagramExports>;

    const { data, error } = await admin
      .from('coach_diagram_exports')
      .select('*')
      .eq('id', params.diagramId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await authorizeScope(auth!, data);

    return NextResponse.json({ diagram: data }, { status: 200 });
  },
});

export const PUT = apiHandler({
  auth: 'user',
  input: updateSchema,
  handler: async ({ auth, params, body: parsed }) => {
    const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithMediaAndCoachDiagrams>;
    const userId = auth!.user!.id;

    const { data: existing, error: getErr } = await admin
      .from('coach_diagram_exports')
      .select('id, tenant_id, scope_type')
      .eq('id', params.diagramId)
      .single();

    if (getErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Authorization based on existing row (no scope escalations via PUT)
    await authorizeScope(auth!, existing);

    const nextDocument = parsed.document;
    const nextSvg = parsed.svg;

    let canonicalDoc: CoachDiagramDocumentV1 | null = null;
    if (nextDocument !== undefined) {
      const docParsed = coachDiagramDocumentSchemaV1.safeParse(nextDocument);
      if (!docParsed.success) {
        return NextResponse.json({ error: 'Invalid payload', details: { document: docParsed.error.flatten() } }, { status: 400 });
      }
      if (docParsed.data.id !== params.diagramId) {
        return NextResponse.json({ error: 'Invalid payload', details: { document: { id: ['Must match diagramId'] } } }, { status: 400 });
      }
      canonicalDoc = docParsed.data;
    }

    const nowIso = new Date().toISOString();

    const patch: CoachDiagramExportsTable['Update'] = {
      exported_at: nowIso,
      exported_by_user_id: userId,
      exported_by_tool: parsed.exportedByTool ?? 'coach-diagram-builder',
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
      .eq('id', params.diagramId);

    if (updErr) {
      return NextResponse.json({ error: 'Failed to update diagram', details: updErr.message ?? 'Unknown error' }, { status: 500 });
    }

    // Keep media row in sync (title + url)
    const appUrl = getAppUrl();
    if (appUrl) {
      const mediaUrl = `${appUrl}/api/coach-diagrams/${params.diagramId}/svg`;
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
        .eq('id', params.diagramId);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  },
});

export const DELETE = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
    const admin = createServiceRoleClient() as unknown as SupabaseClient<DatabaseWithMediaAndCoachDiagrams>;

    const { data: existing, error: getErr } = await admin
      .from('coach_diagram_exports')
      .select('id, tenant_id, scope_type')
      .eq('id', params.diagramId)
      .single();

    if (getErr || !existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await authorizeScope(auth!, existing);

    // Best-effort: delete media row too. (FKs via game_media may prevent deletion.)
    await admin.from('media').delete().eq('id', params.diagramId);

    const { error: delErr } = await admin.from('coach_diagram_exports').delete().eq('id', params.diagramId);
    if (delErr) {
      return NextResponse.json({ error: 'Failed to delete diagram', details: delErr.message ?? 'Unknown error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  },
});
