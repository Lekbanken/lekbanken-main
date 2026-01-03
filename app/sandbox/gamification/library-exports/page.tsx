import Link from 'next/link';
import { SandboxShell } from '../../components/shell/SandboxShellV2';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { StatusBadge } from '../status';

const schemaSample = `{
  "schema_version": "1.0",
  "exported_at": "2026-01-01T12:00:00Z",
  "exported_by": { "user_id": "uuid", "tool": "admin-library-badges" },
  "publish_scope": { "type": "tenant|global", "tenant_id": "uuid|null" },
  "achievements": [
    {
      "achievement_key": "string",
      "name": "string",
      "description": "string",
      "unlock": { "condition_type": "manual", "unlock_criteria": { "type": "manual" } }
    }
  ]
}`;

export default function LibraryExportsSandboxPage() {
  return (
    <SandboxShell
      moduleId="gamification-library-exports"
      title="Library Exports"
      description="Award builder export schema and API endpoints."
    >
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>What is this?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Canonical export format for badge builder data used across admin tools.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Stored in award_builder_exports</li>
                <li>Validated by schema + runtime checks</li>
                <li>Used by admin badge library</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dependencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-4 space-y-1">
                <li>Table: award_builder_exports</li>
                <li>API: /api/admin/award-builder/exports</li>
                <li>Docs: AWARD_BUILDER_EXPORT_SCHEMA_V1</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Create a badge in /admin/library/badges.</li>
                <li>Fetch exports from /api/admin/award-builder/exports.</li>
                <li>Validate JSON against the schema doc.</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge state="running" />
            <span>Exports are stored + validated; admin UI depends on DB data.</span>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Schema snapshot</h2>
            <Badge variant="outline" size="sm">
              v1.0
            </Badge>
          </div>
          <Card className="border-border/60">
            <CardContent>
              <pre className="overflow-x-auto rounded-xl bg-muted p-4 text-xs text-muted-foreground">
                {schemaSample}
              </pre>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Related routes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Link className="text-primary hover:underline" href="/admin/library/badges">
              /admin/library/badges
            </Link>
            <Link className="text-primary hover:underline" href="/api/admin/award-builder/exports">
              /api/admin/award-builder/exports
            </Link>
            <Link className="text-primary hover:underline" href="/docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md">
              /docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md
            </Link>
          </CardContent>
        </Card>
      </div>
    </SandboxShell>
  );
}
