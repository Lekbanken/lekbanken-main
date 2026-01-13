'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TOOL_REGISTRY } from '../registry';
import type { ToolKey, ToolRole } from '../types';
import { isScopeAllowedForRole } from '../types';
import { getEnabledToolsForSession, type GameToolRow } from '../api';
import { DiceRollerV1 } from './DiceRollerV1';
import { CoachDiagramBuilderV1 } from './CoachDiagramBuilderV1';
import { ConversationCardsV1 } from './ConversationCardsV1';

function useIsDesktopSm(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    // Legacy Safari fallback
    (media as unknown as { addListener: (cb: () => void) => void }).addListener(update);
    return () => (media as unknown as { removeListener: (cb: () => void) => void }).removeListener(update);
  }, []);

  return isDesktop;
}

export function Toolbelt({
  sessionId,
  role,
  participantToken,
  buttonLabel,
  buttonClassName,
}: {
  sessionId: string;
  role: ToolRole;
  participantToken?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}) {
  const t = useTranslations('tools.toolbelt');
  const isDesktop = useIsDesktopSm();
  const [open, setOpen] = useState(false);
  const [tools, setTools] = useState<GameToolRow[] | null>(null);
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await getEnabledToolsForSession({ sessionId, participantToken });
      if (cancelled) return;
      setTools(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, participantToken]);

  const availableToolDefs = useMemo(() => {
    const enabled = new Map<ToolKey, GameToolRow>();
    for (const row of tools ?? []) enabled.set(row.tool_key, row);

    return TOOL_REGISTRY.filter((def) => {
      const row = enabled.get(def.key);
      if (!row?.enabled) return false;
      return isScopeAllowedForRole(row.scope, role);
    });
  }, [tools, role]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !activeTool && availableToolDefs.length > 0) {
      setActiveTool(availableToolDefs[0].key);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className={buttonClassName} disabled={tools === null}>
          {buttonLabel ?? t('button')}
        </Button>
      </SheetTrigger>
      <SheetContent
        side={isDesktop ? 'right' : 'bottom'}
        className={isDesktop ? '' : 'rounded-t-3xl'}
      >
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>

        {tools && availableToolDefs.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground">
            {t('noToolsEnabled')}
          </div>
        ) : (

          <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              {availableToolDefs.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  className={
                    activeTool === tool.key
                      ? 'w-full rounded-lg border border-border bg-muted px-3 py-2 text-left text-sm font-medium'
                      : 'w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted'
                  }
                  onClick={() => setActiveTool(tool.key)}
                >
                  {tool.name}
                </button>
              ))}
            </div>

            <div className="min-h-[180px]">
              {activeTool === 'dice_roller_v1' && <DiceRollerV1 />}

              {activeTool === 'coach_diagram_builder_v1' && (
                <CoachDiagramBuilderV1 sessionId={sessionId} participantToken={participantToken} />
              )}

              {activeTool === 'conversation_cards_v1' && <ConversationCardsV1 />}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
