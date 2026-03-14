import { getTranslations } from 'next-intl/server';
import { PageTitleHeader } from "@/components/app/PageTitleHeader";
import { Card, CardContent } from "@/components/ui/card";
import { appNavItems } from "@/components/app/nav-items";
import { createServerRlsClient } from "@/lib/supabase/server";
import {
  PlayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  TrophyIcon,
  DocumentPlusIcon,
  PaperAirplaneIcon,
  BoltIcon,
  StarIcon,
  ShoppingBagIcon,
  GiftIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { type ReactNode } from 'react';

export const dynamic = "force-dynamic";

function getEventIcon(source: string, eventType: string): ReactNode {
  if (eventType === 'achievement_unlocked') return <TrophyIcon className="h-5 w-5" />;
  if (eventType === 'plan_published') return <PaperAirplaneIcon className="h-5 w-5" />;
  if (eventType === 'plan_created') return <DocumentPlusIcon className="h-5 w-5" />;
  if (eventType === 'streak_bonus') return <FireIcon className="h-5 w-5" />;
  if (eventType === 'powerup_consumed') return <BoltIcon className="h-5 w-5" />;
  if (eventType === 'shop_purchase') return <ShoppingBagIcon className="h-5 w-5" />;
  if (eventType === 'reward_issued') return <GiftIcon className="h-5 w-5" />;
  if (eventType === 'first_session') return <StarIcon className="h-5 w-5" />;
  if (source === 'play') return <PlayIcon className="h-5 w-5" />;
  if (source === 'planner') return <CalendarDaysIcon className="h-5 w-5" />;
  return <CheckCircleIcon className="h-5 w-5" />;
}

function getIconColors(source: string, eventType: string): string {
  if (eventType === 'achievement_unlocked') return 'bg-amber-500/15 text-amber-500';
  if (eventType === 'streak_bonus') return 'bg-orange-500/15 text-orange-500';
  if (eventType === 'plan_published' || eventType === 'plan_created') return 'bg-blue-500/15 text-blue-500';
  if (eventType === 'powerup_consumed') return 'bg-purple-500/15 text-purple-500';
  if (eventType === 'shop_purchase') return 'bg-pink-500/15 text-pink-500';
  if (eventType === 'reward_issued') return 'bg-yellow-500/15 text-yellow-600';
  if (source === 'play') return 'bg-emerald-500/15 text-emerald-600';
  if (source === 'planner') return 'bg-indigo-500/15 text-indigo-600';
  return 'bg-muted text-muted-foreground';
}

export default async function GamificationEventsPage() {
  const t = await getTranslations('app.gamification.events');
  const supabase = await createServerRlsClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dicecoinIcon = appNavItems.find((item) => item.href === "/app/gamification")?.icon;

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t('signInRequired')}
        </CardContent>
      </Card>
    );
  }

  const { data: events } = await supabase
    .from("gamification_events")
    .select("id,event_type,source,created_at")
    .eq("actor_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 pb-32">
      <PageTitleHeader
        icon={dicecoinIcon}
        title={t('title')}
        subtitle={t('subtitle')}
      />

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {events && events.length > 0 ? (
            events.map((evt) => {
              const source = evt.source ?? 'system';
              const eventType = evt.event_type ?? '';
              const labelKey = `eventTypes.${eventType}` as Parameters<typeof t>[0];
              const sourceKey = `sources.${source}` as Parameters<typeof t>[0];
              const label = t.has(labelKey) ? t(labelKey) : eventType.replace(/_/g, ' ');
              const sourceLabel = t.has(sourceKey) ? t(sourceKey) : source;
              const iconColors = getIconColors(source, eventType);

              return (
                <div key={evt.id} className="flex items-center gap-4 px-4 py-4 first:pt-5 last:pb-5">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconColors}`}>
                    {getEventIcon(source, eventType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {sourceLabel}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {evt.created_at ? new Date(evt.created_at).toLocaleString("sv-SE") : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground px-4">
              {t('empty')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
