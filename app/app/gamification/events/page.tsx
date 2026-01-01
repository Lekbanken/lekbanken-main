import { PageTitleHeader } from "@/components/app/PageTitleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { appNavItems } from "@/components/app/nav-items";
import { createServerRlsClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GamificationEventsPage() {
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dicecoinIcon = appNavItems.find((item) => item.href === "/app/gamification")?.icon;

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Du behöver vara inloggad för att se eventloggen.
        </CardContent>
      </Card>
    );
  }

  const { data: events } = await supabase
    .from("gamification_events")
    .select("id,event_type,source,created_at,metadata")
    .eq("actor_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 pb-32">
      <PageTitleHeader
        icon={dicecoinIcon}
        title="DICECOIN"
        subtitle="Eventlogg (read-only)"
      />

      <Card>
        <CardContent className="divide-y divide-border">
          {events && events.length > 0 ? (
            events.map((evt) => (
              <div key={evt.id} className="py-4 first:pt-6 last:pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {evt.source}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {evt.event_type}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {evt.created_at ? new Date(evt.created_at).toLocaleString("sv-SE") : "-"}
                </div>
                {evt.metadata ? (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                    {JSON.stringify(evt.metadata, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Inga event att visa ännu.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
