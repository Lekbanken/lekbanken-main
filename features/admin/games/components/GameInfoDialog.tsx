'use client';

import { useState, type ReactNode } from 'react';
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
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{label}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(value)}>
          Kopiera
        </Button>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs font-mono break-all">
        {value}
      </div>
    </div>
  );
}

function AiPromptsTab({ copy }: { copy: (text: string) => void }) {
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
      ? 'Basic (CSV)'
      : selected === 'facilitated'
        ? 'Facilitated (CSV)'
        : selected === 'participants-light'
          ? 'Participants Light (CSV)'
          : 'Legendary (JSON)';

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="font-semibold">Välj prompt</p>
        <p className="text-sm text-muted-foreground">
          Behöver du artifacts eller triggers? Välj <strong>Legendary (JSON)</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={selected === 'basic' ? 'default' : 'outline'} size="sm" onClick={() => setSelected('basic')}>
          Basic (CSV)
        </Button>
        <Button
          variant={selected === 'facilitated' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('facilitated')}
        >
          Facilitated (CSV)
        </Button>
        <Button
          variant={selected === 'participants-light' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('participants-light')}
        >
          Participants Light (CSV)
        </Button>
        <Button
          variant={selected === 'legendary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelected('legendary')}
        >
          Legendary (JSON)
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-semibold">{title}</p>
        <Button variant="ghost" size="sm" onClick={() => copy(prompt)}>
          Kopiera
        </Button>
      </div>

      <CodeBlock>{prompt}</CodeBlock>
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

function getInfoTabs(): InfoTab[] {
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
      label: 'Översikt',
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">Vad importen gör</p>
            <p className="text-sm text-foreground">
              Importen kan läsa <strong>CSV</strong> (bulk/massimport) och <strong>JSON</strong> (full fidelity).
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">CSV vs JSON</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>
                <strong>CSV:</strong> basic/facilitated + participants-light inom canonical header.
              </li>
              <li>
                <strong>JSON:</strong> Legendary/escape-room (artifacts + triggers + avancerade step-fält).
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">{CANONICAL_CSV_SCOPE_NOTE}</p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Start här (3 steg)</p>
            <ol className="list-decimal pl-5 space-y-1 text-foreground">
              <li>Välj spelläge (basic/facilitated/participants).</li>
              <li>Välj format: CSV (enkelt/bulk) eller JSON (Legendary/full fidelity).</li>
              <li>Validera i Import-dialogen (dry-run) innan import.</li>
            </ol>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Vanliga fel</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>
                <strong>Ogiltigt purpose-id:</strong> main_purpose_id/sub_purpose_ids måste vara riktiga UUID från databasen.
              </li>
              <li>
                <strong>JSON escaping i CSV:</strong> citat i JSON måste skrivas som <code>{'""'}</code> i CSV-cellen.
              </li>
              <li>
                <strong>Saknade steg:</strong> om step_N_title finns måste step_N_body finnas.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'modes',
      label: 'Spellägen',
      render: () => (
        <div className="space-y-3">
          <p className="font-semibold">Spellägen (play_mode)</p>
          <div className="space-y-2 text-muted-foreground">
            <p className="text-sm">Välj läge tidigt – QA, UI och runtime förväntar sig rätt struktur.</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li><strong>Enkel lek (basic):</strong> steg + material. Ingen digital interaktion.</li>
              <li><strong>Ledd aktivitet (facilitated):</strong> steg + faser/timer, ev. publik tavla.</li>
              <li>
                <strong>Deltagarlek (participants):</strong> steg + faser + roller + ev. publik tavla. För Legendary (artifacts/triggers)
                ska du använda JSON-import.
              </li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Minimum required</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li><strong>basic:</strong> minst step_1_title + step_1_body.</li>
              <li><strong>facilitated:</strong> steg krävs; phases_json starkt rekommenderat.</li>
              <li><strong>participants:</strong> steg krävs; roles_json rekommenderas starkt.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'csv',
      label: 'CSV',
      render: (copy) => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">CSV-format (canonical)</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>UTF-8 (med/utan BOM), separator ,</li>
              <li>Celler med komma/radbrytning/citat omsluts av &quot;...&quot;; citat skrivs som &quot;&quot;</li>
              <li>En rad = en lek</li>
            </ul>
          </div>

          <CopyHeaderRow label="Canonical CSV-header (kopiera exakt)" value={CANONICAL_CSV_HEADER} copy={copy} />

          <div className="space-y-1">
            <p className="font-semibold">JSON-kolumner som stöds i CSV</p>
            <p className="text-sm text-foreground">{CANONICAL_CSV_JSON_COLUMNS.join(', ')}</p>
            <p className="text-sm text-muted-foreground">
              Vill du använda artifacts eller triggers? CSV-kontraktet innehåller inte det. Välj JSON-import (Legendary).
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Vanligaste felen</p>
            <ul className="list-disc pl-5 space-y-1 text-foreground">
              <li>Ogiltig JSON i JSON-kolumn (oftast fel citat/escaping).</li>
              <li>step_N_title ifyllt men step_N_body saknas.</li>
              <li>main_purpose_id/sub_purpose_ids är inte giltiga UUID.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'json',
      label: 'JSON',
      render: () => (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-semibold">JSON-import (full fidelity)</p>
            <p className="text-sm text-foreground">
              JSON är formatet för Legendary/escape-room: artifacts + triggers + avancerade step-fält.
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Minimal JSON (1 lek)</p>
            <CodeBlock>{minimalJsonExample}</CodeBlock>
          </div>

          <div className="space-y-1">
            <p className="font-semibold">Order-resolution i triggers</p>
            <p className="text-sm text-foreground">
              Triggers kan referera till <code>stepOrder</code>/<code>phaseOrder</code>/<code>artifactOrder</code> i condition/actions.
              Importen resolverar det till faktiska ID:n.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'ai',
      label: 'AI Prompts',
      render: (copy) => <AiPromptsTab copy={copy} />,
    },
  ];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GameInfoDialog() {
  const { activeTab, setActiveTab } = useTabs('overview');

  const infoTabs = getInfoTabs();

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <InformationCircleIcon className="mr-2 h-4 w-4" />
          Information
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Information om lekar</DialogTitle>
        </DialogHeader>
        <Tabs
          tabs={infoTabs.map((t) => ({ id: t.id, label: t.label }))}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-4"
        />
        {infoTabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id} activeTab={activeTab} className="space-y-4 text-sm leading-6 text-foreground">
            {tab.render(handleCopy)}
          </TabPanel>
        ))}
      </DialogContent>
    </Dialog>
  );
}
