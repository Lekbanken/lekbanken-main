'use client';

import { useState, type ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { Tabs, TabPanel, useTabs } from '@/components/ui/tabs';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { CONVERSATION_CARDS_CSV_HEADERS } from '@/features/conversation-cards/csv-format';

// ============================================
// CSV-format dokumentation
// ============================================

const CSV_FIELD_DESCRIPTIONS: Record<string, { description: string; required: boolean; example: string }> = {
  collection_title: {
    description: 'Titel på samtalskortssamlingen. Alla rader i en fil bör ha samma värde.',
    required: true,
    example: 'Teambuilding Starters',
  },
  collection_description: {
    description: 'Beskrivning av samlingen som helhet.',
    required: false,
    example: 'Korta samtalsövningar för att värma upp team',
  },
  main_purpose: {
    description: 'Huvudsyfte (purpose_key eller namn). Måste matcha ett befintligt syfte.',
    required: false,
    example: 'teambuilding',
  },
  sub_purpose: {
    description: 'Undersyfte kopplat till huvudsyftet.',
    required: false,
    example: 'ice-breakers',
  },
  card_title: {
    description: 'Titel på det enskilda samtalskortet.',
    required: false,
    example: 'Två sanningar och en lögn',
  },
  primary_prompt: {
    description: 'Huvudfrågan eller uppmaningen på kortet.',
    required: true,
    example: 'Berätta tre saker om dig själv – två sanna och en påhittad.',
  },
  followup_1: {
    description: 'Första uppföljningsfrågan.',
    required: false,
    example: 'Varför valde du just den lögnen?',
  },
  followup_2: {
    description: 'Andra uppföljningsfrågan.',
    required: false,
    example: 'Vad överraskade dig mest i svaren?',
  },
  followup_3: {
    description: 'Tredje uppföljningsfrågan.',
    required: false,
    example: 'Hur kan vi använda detta i vårt team?',
  },
  leader_tip: {
    description: 'Tips till den som faciliterar samtalet.',
    required: false,
    example: 'Ge deltagarna 30 sekunder att tänka innan de svarar.',
  },
};

// ============================================
// AI Prompts
// ============================================

const AI_PROMPT_BASIC = `Du är en expert på att skapa engagerande samtalskort för team och grupper. 

Skapa samtalskort i CSV-format med följande kolumner:
${CONVERSATION_CARDS_CSV_HEADERS.join(',')}

REGLER:
- Alla rader ska ha samma collection_title och collection_description
- primary_prompt är obligatorisk för varje kort
- Skapa 10-15 kort per samling
- Använd svenska om inget annat anges
- Gör frågorna öppna och tankeväckande
- VIKTIGT: Omge ALLA textfält med citattecken (") så att kommatecken i texten hanteras korrekt
- Om ett fält innehåller citattecken, dubbla dem ("")

EXEMPEL:
collection_title,collection_description,main_purpose,sub_purpose,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip
"Teambuilding Starters","Korta samtalsövningar för att värma upp team","teambuilding","ice-breakers","Drömresa","Om du kunde åka vart som helst imorgon - vart skulle du åka?","Varför just dit?","Vem skulle du ta med?","Vad skulle du göra där?","Låt alla svara innan ni diskuterar vidare."

Skapa en samling med tema: [ANGE TEMA HÄR]`;

const AI_PROMPT_ADVANCED = `Du är en expert på samtalskort och facilitering av gruppdynamik.

Skapa en komplett CSV-fil med samtalskort enligt detta format:
${CONVERSATION_CARDS_CSV_HEADERS.join(',')}

KRAV:
1. collection_title och collection_description ska vara samma på alla rader
2. main_purpose ska matcha ett giltigt purpose_key (t.ex. collaboration_and_community, creative_thinking, feedback_and_development)
3. sub_purpose ska vara mer specifik och matcha ett befintligt sub-purpose
4. primary_prompt MÅSTE finnas på varje rad
5. Inkludera minst 2 followup-frågor per kort
6. leader_tip ska ge konkret vägledning

CSV-FORMATERING (KRITISKT):
- Omge ALLA textfält med citattecken (") - detta förhindrar problem med kommatecken i texten
- Om ett fält innehåller citattecken, dubbla dem ("")
- Exempel: "Detta är en text med ""citattecken"" inuti"

BEST PRACTICES:
- Börja med enklare frågor och öka komplexiteten
- Variera mellan personliga och professionella teman
- Inkludera både reflekterande och aktionsinriktade frågor
- Gör frågorna tillgängliga för olika personlighetstyper

EXEMPEL PÅ KORREKT FORMATERAD RAD:
"Min samling","Beskrivning med, kommatecken och ""citat""","collaboration_and_community","group_communication","Korttitel","Vad tycker du om...?","Följdfråga 1","Följdfråga 2","Följdfråga 3","Tips till ledaren"

Tema att skapa kort för: [BESKRIV TEMA OCH MÅLGRUPP]`;

// ============================================
// Komponenter
// ============================================

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 overflow-x-auto">
      <pre className="whitespace-pre-wrap break-words text-xs leading-5 font-mono">{children}</pre>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? 'Kopierat!' : 'Kopiera'}
    </Button>
  );
}

type InfoTab = {
  id: string;
  label: string;
  render: () => ReactNode;
};

function getInfoTabs(): InfoTab[] {
  const csvHeader = CONVERSATION_CARDS_CSV_HEADERS.join(',');

  const exampleCsv = `collection_title,collection_description,main_purpose,sub_purpose,card_title,primary_prompt,followup_1,followup_2,followup_3,leader_tip
"Teambuilding Starters","Korta samtalsövningar för att värma upp team, bygga förtroende och stärka gruppen","collaboration_and_community","group_communication","Drömresa","Om du kunde åka vart som helst imorgon - vart?","Varför just dit?","Vem skulle du ta med?","","Låt alla svara innan diskussion"
"Teambuilding Starters","Korta samtalsövningar för att värma upp team, bygga förtroende och stärka gruppen","collaboration_and_community","group_communication","Superkraft","Om du hade en superkraft - vilken?","Hur skulle du använda den?","Skulle du berätta för någon?","","Uppmuntra kreativitet"`;

  return [
    {
      id: 'overview',
      label: 'Översikt',
      render: () => (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Vad är samtalskort?</h3>
            <p className="text-muted-foreground text-sm">
              Samtalskort är strukturerade frågor som underlättar meningsfulla samtal i grupper.
              Varje kort har en huvudfråga (primary_prompt) och kan ha uppföljningsfrågor.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Import via CSV</h3>
            <p className="text-muted-foreground text-sm">
              Du kan importera samtalskort via CSV. Om du importerar till en ny samling
              behöver du ange collection_title på första raden. Alla kort i samma fil
              läggs till samma samling.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Arbetsflöde</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Skapa CSV-fil med dina samtalskort (eller använd AI-prompt)</li>
              <li>Klicka på &quot;Importera&quot; på huvudsidan</li>
              <li>Välj scope (Global eller Tenant)</li>
              <li>Klistra in eller ladda upp CSV</li>
              <li>Validera och importera</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 'csv-format',
      label: 'CSV-format',
      render: () => (
        <div className="space-y-4">
          {/* Varning om citattecken */}
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
              ⚠️ Viktigt: Citattecken i CSV
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-300 mt-1">
              Om ett fält innehåller <strong>kommatecken</strong>, måste hela fältet omslutas med citattecken (&quot;).
              Exempel: <code className="bg-amber-200/50 dark:bg-amber-900/50 px-1 rounded">&quot;Text med, kommatecken&quot;</code>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">CSV Header</h3>
            <CopyButton text={csvHeader} />
          </div>
          <CodeBlock>{csvHeader}</CodeBlock>

          <div>
            <h3 className="font-semibold mb-3">Fältbeskrivningar</h3>
            <div className="space-y-3">
              {CONVERSATION_CARDS_CSV_HEADERS.map((header) => {
                const field = CSV_FIELD_DESCRIPTIONS[header];
                if (!field) return null;
                return (
                  <div key={header} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-1 rounded">{header}</code>
                      {field.required && (
                        <span className="text-xs text-destructive font-medium">Obligatorisk</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{field.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Exempel:</span> {field.example}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Exempelfil</h3>
            <CopyButton text={exampleCsv} />
          </div>
          <CodeBlock>{exampleCsv}</CodeBlock>
        </div>
      ),
    },
    {
      id: 'ai-prompts',
      label: 'AI-prompts',
      render: () => (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Använd dessa prompts med ChatGPT, Claude eller annan AI för att generera samtalskort.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Basic Prompt</h3>
              <CopyButton text={AI_PROMPT_BASIC} />
            </div>
            <p className="text-xs text-muted-foreground">
              Enkel prompt för att snabbt skapa en samling samtalskort.
            </p>
            <CodeBlock>{AI_PROMPT_BASIC}</CodeBlock>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Advanced Prompt</h3>
              <CopyButton text={AI_PROMPT_ADVANCED} />
            </div>
            <p className="text-xs text-muted-foreground">
              Mer detaljerad prompt för högkvalitativa samtalskort med best practices.
            </p>
            <CodeBlock>{AI_PROMPT_ADVANCED}</CodeBlock>
          </div>
        </div>
      ),
    },
    {
      id: 'tips',
      label: 'Tips & tricks',
      render: () => (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Bra samtalskort</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Är öppna och inbjuder till reflektion</li>
              <li>Har ingen &quot;rätt&quot; eller &quot;fel&quot; svar</li>
              <li>Anpassas till målgruppens kontext</li>
              <li>Börjar enkelt och ökar gradvis i djup</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Uppföljningsfrågor</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Hjälper till att fördjupa samtalet</li>
              <li>Bör bygga på svaret på huvudfrågan</li>
              <li>Kan vara mer personliga eller actionorienterade</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Leader tips</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ge konkret vägledning för facilitatorn</li>
              <li>Inkludera timing-förslag</li>
              <li>Nämn potentiella utmaningar och hur man hanterar dem</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Syften (purposes)</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Du kan koppla samtalskort till syften för bättre filtrering. Använd <code className="bg-muted px-1 rounded">purpose_key</code> (snake_case):
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><code className="bg-muted px-1 rounded">collaboration_and_community</code> - Samarbete & gemenskap</li>
              <li><code className="bg-muted px-1 rounded">feedback_and_development</code> - Feedback & utveckling</li>
              <li><code className="bg-muted px-1 rounded">creative_thinking</code> - Kreativt tänkande</li>
              <li><code className="bg-muted px-1 rounded">reflection_and_insight</code> - Reflektion & insikt</li>
              <li><code className="bg-muted px-1 rounded">leadership_and_roles</code> - Ledarskap & roller</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Se alla syften i admin under &quot;Syften&quot;-fliken.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">CSV-tips</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Omge alltid textfält med citattecken (&quot;) för säkerhet</li>
              <li>Om ett fält innehåller citattecken, dubbla dem (&quot;&quot;)</li>
              <li>Spara som UTF-8 för korrekt hantering av svenska tecken</li>
              <li>Excel kan exportera CSV med citattecken automatiskt</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];
}

// ============================================
// Main Export
// ============================================

export function ConversationCardsInfoDialog() {
  const { activeTab, setActiveTab } = useTabs('overview');
  const tabs = getInfoTabs();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <InformationCircleIcon className="mr-2 h-4 w-4" />
          Information
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Information om samtalskort</DialogTitle>
        </DialogHeader>
        <Tabs
          tabs={tabs.map((t) => ({ id: t.id, label: t.label }))}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
          className="mb-4"
        />
        {tabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id} activeTab={activeTab} className="text-sm leading-6">
            {tab.render()}
          </TabPanel>
        ))}
      </DialogContent>
    </Dialog>
  );
}
