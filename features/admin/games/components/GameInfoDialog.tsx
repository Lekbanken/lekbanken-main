'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs';
import { CANONICAL_CSV_HEADER, CANONICAL_CSV_JSON_COLUMNS, CANONICAL_CSV_SCOPE_NOTE } from '../import-spec';
import {
  PROMPT_BASIC_CSV,
  PROMPT_FACILITATED_CSV,
  PROMPT_PARTICIPANTS_LIGHT_CSV,
  PROMPT_LEGENDARY_JSON,
} from '../docs/prompts';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <pre className="whitespace-pre-wrap break-words text-xs leading-5">{children}</pre>
    </div>
  );
}

function CopyHeaderRow({ label, value, copy }: { label: string; value: string; copy: (text: string) => void }) {
  const t = useTranslations('admin.games.import');
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{label}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(value)}>{t('copy')}</Button>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs font-mono break-all">
        {value}
      </div>
    </div>
  );
}

function AiPromptsTab({ copy }: { copy: (text: string) => void }) {
  const t = useTranslations('admin.games.import');
  const [selected, setSelected] = useState<'basic' | 'facilitated' | 'participants-light' | 'legendary'>('basic');

  const prompt =
    selected === 'basic'
      ? PROMPT_BASIC_CSV
      : selected === 'facilitated'
        ? PROMPT_FACILITATED_CSV
        : selected === 'participants-light'
          ? PROMPT_PARTICIPANTS_LIGHT_CSV
          : PROMPT_LEGENDARY_JSON;

  const title =
    selected === 'basic'
      ? t('prompt.basic')
      : selected === 'facilitated'
        ? t('prompt.facilitated')
        : selected === 'participants-light'
          ? t('prompt.participantsLight')
          : t('prompt.legendary');

  const isCsvPrompt = selected !== 'legendary';

  const rich = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
    code: (chunks: ReactNode) => <code>{chunks}</code>,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-semibold">{t('selectPrompt')}</p>
        <p className="text-sm text-muted-foreground">{t.rich('artifactsOrTriggers', rich)}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={selected === 'basic' ? 'default' : 'outline'} size="sm" onClick={() => setSelected('basic')}>
          {t('prompt.basic')}
        </Button>
        <Button
          variant={selected === 'facilitated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('facilitated')}
        >
          {t('prompt.facilitated')}
        </Button>
        <Button
          variant={selected === 'participants-light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('participants-light')}
        >
          {t('prompt.participantsLight')}
        </Button>
        <Button
          variant={selected === 'legendary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('legendary')}
        >
          {t('prompt.legendary')}
        </Button>
      </div>

      {/* Copy buttons row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button variant="secondary" size="sm" onClick={() => copy(prompt)}>
          {t('copyPrompt')}
        </Button>
        {isCsvPrompt && (
          <Button variant="outline" size="sm" onClick={() => copy(CANONICAL_CSV_HEADER)}>
            {t('copyCsvHeader')}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="font-semibold">{title}</p>
        <CodeBlock>{prompt}</CodeBlock>
      </div>

      {/* Fix-loop section */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="font-semibold">{t('fixLoop.title')}</p>
        <p className="text-sm text-muted-foreground">{t('fixLoop.description')}</p>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground">
          <li>{t.rich('fixLoop.step1', rich)}</li>
          <li>{t.rich('fixLoop.step2', rich)}</li>
          <li>{t.rich('fixLoop.step3', rich)}</li>
          <li>{t.rich('fixLoop.step4', rich)}</li>
        </ol>
      </div>
    </div>
  );
}

// ============================================================================
// INFO TABS
// ============================================================================

type InfoTab = {
  id: string;
  label: string;
  render: (copy: (text: string) => void) => ReactNode;
};

type ImportT = ReturnType<typeof useTranslations>;

function getInfoTabs(t: ImportT): InfoTab[] {
  const rich = {
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
    code: (chunks: ReactNode) => <code>{chunks}</code>,
  };

  const minimalJsonExample = `[
  {
    "game_key": "mysteriet-001",
    "name": "Mysteriet",
    "short_description": "En deltagarlek med roller.",
    "description": "...",
    "play_mode": "participants",
    "status": "draft",
    "locale": "sv-SE",
    "steps": [
      { "step_order": 1, "title": "Start", "body": "...", "duration_seconds": 120, "leader_script": "..." }
    ],
    "phases": [
      { "phase_order": 1, "name": "Intro", "phase_type": "intro", "duration_seconds": 300, "timer_visible": true, "timer_style": "countdown", "description": null, "board_message": null, "auto_advance": false }
    ],
    "roles": [
      { "role_order": 1, "name": "Spion", "icon": null, "color": null, "public_description": null, "private_instructions": "...", "private_hints": null, "min_count": 1, "max_count": null, "assignment_strategy": "random", "scaling_rules": null, "conflicts_with": [] }
    ],
    "boardConfig": null,
    "artifacts": [],
    "triggers": []
  }
]`;

  return [
    {
      id: 'overview',
      label: t('overviewTab'),
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">{t('whatImportDoes')}</p>
            <p className="text-sm text-foreground">
              {t.rich('importCanRead', rich)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('csvVsJson')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t.rich('csvBasic', rich)}</li>
              <li>{t.rich('jsonLegendary', rich)}</li>
            </ul>
            <p className="text-sm text-muted-foreground">{CANONICAL_CSV_SCOPE_NOTE}</p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('startHere')}</p>
            <ol className="list-decimal pl-5 space-y-1 text-foreground">
              <li>{t('step1')}</li>
              <li>{t('step2')}</li>
              <li>{t('step3')}</li>
            </ol>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('commonErrors')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t.rich('invalidPurpose', rich)}</li>
              <li>{t.rich('jsonEscaping', rich)}</li>
              <li>{t.rich('missingSteps', rich)}</li>
            </ul>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="font-semibold">{t('fixLoop.title')}</p>
            <p className="text-sm text-muted-foreground">{t('fixLoop.description')}</p>
            <ol className="list-decimal pl-5 space-y-1 text-foreground">
              <li>{t.rich('fixLoop.step1', rich)}</li>
              <li>{t.rich('fixLoop.step2', rich)}</li>
              <li>{t.rich('fixLoop.step3', rich)}</li>
              <li>{t.rich('fixLoop.step4', rich)}</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'modes',
      label: t('playModesTab'),
      render: () => (
        <div className="space-y-3">
          <p className="font-semibold">{t('playModes')}</p>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-sm">{t('chooseEarly')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t.rich('basicMode', rich)}</li>
              <li>{t.rich('facilitatedMode', rich)}</li>
              <li>{t.rich('participantsMode', rich)}</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">{t('minimumRequired')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t.rich('basicReq', rich)}</li>
              <li>{t.rich('facilitatedReq', rich)}</li>
              <li>{t.rich('participantsReq', rich)}</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'csv',
      label: t('csvTab'),
      render: (copy) => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">{t('csvFormat')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t('csvFormatList1')}</li>
              <li>{t('csvFormatList2')}</li>
              <li>{t('csvFormatList3')}</li>
            </ul>
          </div>

          <CopyHeaderRow label={t('canonicalCsvHeader')} value={CANONICAL_CSV_HEADER} copy={copy} />

          <div className="space-y-1">
            <p className="font-semibold">{t('jsonColumnsInCsv')}</p>
            <p className="text-sm text-foreground">{CANONICAL_CSV_JSON_COLUMNS.join(', ')}</p>
            <p className="text-sm text-muted-foreground">
              {t('useJsonForArtifacts')}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('commonMistakes')}</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>{t('invalidJsonInColumn')}</li>
              <li>{t('stepTitleWithoutBody')}</li>
              <li>{t('invalidUuid')}</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'json',
      label: t('jsonTab'),
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">{t('jsonImportFull')}</p>
            <p className="text-sm text-foreground">
              {t('jsonLegendaryDesc')}
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">{t('minimalJson')}</p>
            <CodeBlock>{minimalJsonExample}</CodeBlock>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">{t('orderResolution')}</p>
            <p className="text-sm text-foreground">
              {t('orderResolutionDesc')}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai',
      label: t('aiPromptsTab'),
      render: (copy) => <AiPromptsTab copy={copy} />,
    },
  ];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// Helper for hydration-safe client-only rendering
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function GameInfoDialog() {
  const t = useTranslations('admin.games.import');

  // Hydration-safe: false on server, true on client
  const isClient = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);
  const { activeTab, setActiveTab } = useTabs('overview');

  const infoTabs = getInfoTabs(t);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error(err);
    }
  };

  // Radix Dialog can produce hydration warnings with React/Next SSR when generated IDs
  // differ between server and client. Rendering the Dialog only after mount keeps the
  // server and initial client HTML identical.
  if (!isClient) {
    return (
      <Button variant="outline" size="sm" disabled>
        <InformationCircleIcon className="mr-2 h-4 w-4" />
        {t('infoButton')}
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <InformationCircleIcon className="mr-2 h-4 w-4" />
          {t('infoButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col">
        <div className="shrink-0 px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{t('infoDialogTitle')}</DialogTitle>
          </DialogHeader>
          <Tabs
            tabs={infoTabs.map((t) => ({ id: t.id, label: t.label }))}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
            className="mt-4"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4">
          {infoTabs.map((tab) => (
            <TabPanel
              key={tab.id}
              id={tab.id}
              activeTab={activeTab}
              className="min-w-0 space-y-4 text-sm leading-6 text-foreground"
            >
              {tab.render(handleCopy)}
            </TabPanel>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
