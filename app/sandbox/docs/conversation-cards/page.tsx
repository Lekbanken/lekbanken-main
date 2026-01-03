import { notFound } from 'next/navigation'
import { SandboxShell } from '../../components/shell/SandboxShellV2'

export const dynamic = 'force-dynamic'

const CSV_HEADER =
  'collection_title,collection_description,main_purpose,sub_purpose,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip'

export default function ConversationCardsDocsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <SandboxShell
      moduleId="conversation-cards"
      title="Samtalskort (Toolbelt + Artifact)"
      description="Översikt av Samtalskort: Admin-hantering, strikt CSV-import, Toolbelt-tool och read-only artifact-rendering."
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-base font-semibold text-foreground">Snabbstart</h2>
          <ol className="mt-3 list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Skapa en samling i Admin: <span className="font-mono">/admin/toolbelt/conversation-cards</span></li>
            <li>Importera kort via CSV (strikt header, se nedan).</li>
            <li>Publicera samlingen (status: <span className="font-mono">published</span>).</li>
            <li>
              Toolbelt: aktivera tool key <span className="font-mono">conversation_cards_v1</span> i din session/game.
            </li>
            <li>
              Artifact: skapa en artifact med <span className="font-mono">artifact_type=conversation_cards_collection</span> och sätt
              <span className="font-mono"> metadata.conversation_card_collection_id</span> till samlingens id.
            </li>
          </ol>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-base font-semibold text-foreground">CSV-import</h2>
          <p className="text-sm text-muted-foreground">
            CSV-importen är låst till exakt header (ordning + stavning). Importen publicerar inte automatiskt.
          </p>
          <div className="rounded border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold text-muted-foreground">Exakt header</div>
            <div className="mt-1 font-mono text-xs text-foreground break-all">{CSV_HEADER}</div>
          </div>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li><span className="font-mono">primary_prompt</span> krävs</li>
            <li>
              <span className="font-mono">main_purpose</span> och <span className="font-mono">sub_purpose</span> matchas mot befintliga
              <span className="font-mono"> purposes</span> via <span className="font-mono">purpose_key</span> (exakt) eller <span className="font-mono">name</span> (case-insensitive)
            </li>
            <li>Inga syften skapas automatiskt</li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-base font-semibold text-foreground">Behörighet</h2>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              Global scope: skrivning kräver <span className="font-mono">system_admin</span>
            </li>
            <li>
              Tenant scope: skrivning kräver tenant role <span className="font-mono">owner|admin</span>
            </li>
            <li>
              Toolbelt-endpoints är published-only (konsumtion) och ska inte ge draft-innehåll
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-base font-semibold text-foreground">Artifact (Play)</h2>
          <p className="text-sm text-muted-foreground">Artifact-rendering är read-only och visar endast publicerade samlingar.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded border border-border bg-muted/30 p-3">
              <div className="text-xs font-semibold text-muted-foreground">Artifact type</div>
              <div className="mt-1 font-mono text-xs text-foreground">conversation_cards_collection</div>
            </div>
            <div className="rounded border border-border bg-muted/30 p-3">
              <div className="text-xs font-semibold text-muted-foreground">Metadata</div>
              <div className="mt-1 font-mono text-xs text-foreground">conversation_card_collection_id</div>
            </div>
          </div>

          <div className="rounded border border-border bg-muted/30 p-3">
            <div className="text-xs font-semibold text-muted-foreground">Play API</div>
            <div className="mt-1 font-mono text-xs text-foreground break-all">
              GET /api/play/sessions/[id]/conversation-cards/collections/[collectionId]
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Auth: host session user eller participant via <span className="font-mono">x-participant-token</span>. Tenant-samlingar begränsas till sessionens tenant.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-base font-semibold text-foreground">Systemfacit</h2>
          <p className="text-sm text-muted-foreground">
            Källan till sanning för detaljer (schema, RLS, endpoints) finns i <span className="font-mono">docs/CONVERSATION_CARDS_SYSTEM_FACIT.md</span>.
          </p>
          <p className="text-xs text-muted-foreground">
            Obs: tills Supabase-typer är regenererade kan viss serverkod använda tillfälliga casts.
          </p>
        </div>
      </div>
    </SandboxShell>
  )
}
