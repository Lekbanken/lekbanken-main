/**
 * Admin Support Automation Page
 * 
 * Manage routing rules, notification templates, and SLA settings.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { checkIsSystemAdmin } from '@/app/actions/tickets-admin';
import { 
  listRoutingRules, 
  listNotificationTemplates,
  runSlaEscalation,
} from '@/app/actions/support-automation';
import { Heading, Subheading, Text } from '@/catalyst-ui-kit/typescript/heading';
import { Badge } from '@/catalyst-ui-kit/typescript/badge';
import { Button } from '@/catalyst-ui-kit/typescript/button';
import { 
  Table, 
  TableHead, 
  TableRow, 
  TableHeader, 
  TableBody, 
  TableCell 
} from '@/catalyst-ui-kit/typescript/table';
import { 
  CogIcon, 
  BellIcon, 
  ClockIcon,
  PlusIcon,
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Automation | Support Admin',
  description: 'Hantera routingregler, notifikationsmallar och SLA-inställningar',
};

// ============================================
// ESCALATION BUTTON COMPONENT
// ============================================

function EscalationButton() {
  async function handleEscalation() {
    'use server';
    const result = await runSlaEscalation();
    if (result.success && result.escalatedTickets && result.escalatedTickets.length > 0) {
      // In a real app, you'd show a toast or redirect with message
      console.log(`Escalated ${result.escalatedTickets.length} tickets`);
    }
  }

  return (
    <form action={handleEscalation}>
      <Button type="submit" color="amber" className="gap-2">
        <PlayIcon className="h-4 w-4" />
        Kör SLA-eskalering nu
      </Button>
    </form>
  );
}

// ============================================
// ROUTING RULES TABLE
// ============================================

async function RoutingRulesSection() {
  const result = await listRoutingRules();
  const rules = result.data || [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CogIcon className="h-6 w-6 text-zinc-500" />
          <Subheading>Routingregler</Subheading>
        </div>
        <Button href="/admin/support/automation/rules/new" color="dark" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Ny regel
        </Button>
      </div>
      
      <Text>
        Routingregler tilldelas automatiskt när nya ärenden skapas. 
        Regler med lägre prioritetsnummer utvärderas först.
      </Text>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <CogIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <Text className="mt-2">Inga routingregler har skapats än.</Text>
          <Button 
            href="/admin/support/automation/rules/new" 
            color="dark" 
            className="mt-4 gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Skapa första regeln
          </Button>
        </div>
      ) : (
        <Table className="mt-4">
          <TableHead>
            <TableRow>
              <TableHeader>Namn</TableHeader>
              <TableHeader>Matchning</TableHeader>
              <TableHeader>Åtgärd</TableHeader>
              <TableHeader>Prioritet</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id} href={`/admin/support/automation/rules/${rule.id}`}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {rule.match_category && (
                      <Badge color="blue">Kategori: {rule.match_category}</Badge>
                    )}
                    {rule.match_priority && (
                      <Badge color="amber">Prioritet: {rule.match_priority}</Badge>
                    )}
                    {!rule.match_category && !rule.match_priority && (
                      <Badge color="zinc">Alla ärenden</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {rule.assign_to_user_email && (
                      <Badge color="green">→ {rule.assign_to_user_email}</Badge>
                    )}
                    {rule.set_priority && (
                      <Badge color="amber">Prioritet: {rule.set_priority}</Badge>
                    )}
                    {rule.set_sla_hours && (
                      <Badge color="purple">SLA: {rule.set_sla_hours}h</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{rule.priority_order}</TableCell>
                <TableCell>
                  <Badge color={rule.is_active ? 'green' : 'zinc'}>
                    {rule.is_active ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

// ============================================
// NOTIFICATION TEMPLATES TABLE
// ============================================

async function NotificationTemplatesSection() {
  const result = await listNotificationTemplates({ includeSystem: true });
  const templates = result.data || [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellIcon className="h-6 w-6 text-zinc-500" />
          <Subheading>Notifikationsmallar</Subheading>
        </div>
        <Button href="/admin/support/automation/templates/new" color="dark" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          Ny mall
        </Button>
      </div>
      
      <Text>
        Notifikationsmallar styr innehållet i automatiska meddelanden. 
        Använd variabler som {"{{ticket_title}}"} för dynamiskt innehåll.
      </Text>

      <Table className="mt-4">
        <TableHead>
          <TableRow>
            <TableHeader>Namn</TableHeader>
            <TableHeader>Nyckel</TableHeader>
            <TableHeader>Kategori</TableHeader>
            <TableHeader>Typ</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {templates.map((template) => (
            <TableRow 
              key={template.id} 
              href={template.is_system ? undefined : `/admin/support/automation/templates/${template.id}`}
            >
              <TableCell className="font-medium">
                {template.name}
                {template.is_system && (
                  <Badge color="blue" className="ml-2">System</Badge>
                )}
              </TableCell>
              <TableCell>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                  {template.template_key}
                </code>
              </TableCell>
              <TableCell>
                <Badge color="zinc">{template.category}</Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  color={
                    template.type === 'error' ? 'red' :
                    template.type === 'warning' ? 'amber' :
                    template.type === 'success' ? 'green' :
                    'blue'
                  }
                >
                  {template.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge color={template.is_active ? 'green' : 'zinc'}>
                  {template.is_active ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

// ============================================
// SLA SETTINGS SECTION
// ============================================

async function SlaSettingsSection() {
  const isAdmin = await checkIsSystemAdmin();

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <ClockIcon className="h-6 w-6 text-zinc-500" />
        <Subheading>SLA & Eskalering</Subheading>
      </div>
      
      <Text>
        SLA-eskalering körs automatiskt varje timme. 
        Ärenden som passerat sin deadline eskaleras till högre prioritet.
      </Text>

      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Text className="text-sm text-zinc-500">Eskaleringssteg</Text>
            <Text className="text-lg font-semibold">
              low → medium → high → urgent
            </Text>
          </div>
          <div>
            <Text className="text-sm text-zinc-500">Minsta tid mellan eskaleringar</Text>
            <Text className="text-lg font-semibold">1 timme</Text>
          </div>
          <div>
            <Text className="text-sm text-zinc-500">Automatisk körning</Text>
            <Text className="text-lg font-semibold">Varje timme (cron)</Text>
          </div>
          <div>
            <Text className="text-sm text-zinc-500">Status</Text>
            <Badge color="green">Aktiv</Badge>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 flex items-center gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <EscalationButton />
            <Text className="text-sm text-zinc-500">
              Manuell körning eskalar alla ärenden som passerat deadline just nu.
            </Text>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================
// LOADING FALLBACK
// ============================================

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-4 w-96 rounded bg-zinc-200 dark:bg-zinc-700" />
      <div className="h-64 rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default async function SupportAutomationPage() {
  // Check admin access
  const isAdmin = await checkIsSystemAdmin();
  
  // For now, only system admins can access automation
  // TODO: Add tenant admin access for tenant-specific rules
  if (!isAdmin) {
    redirect('/admin');
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading>Automation</Heading>
          <Text className="mt-1">
            Konfigurera automatiska regler, mallar och SLA-inställningar för ärendehantering.
          </Text>
        </div>
        <Button href="/admin/support" outline className="gap-2">
          <ArrowPathIcon className="h-4 w-4" />
          Tillbaka till Support
        </Button>
      </div>

      {/* Routing Rules */}
      <Suspense fallback={<SectionSkeleton />}>
        <RoutingRulesSection />
      </Suspense>

      {/* Notification Templates */}
      <Suspense fallback={<SectionSkeleton />}>
        <NotificationTemplatesSection />
      </Suspense>

      {/* SLA Settings */}
      <Suspense fallback={<SectionSkeleton />}>
        <SlaSettingsSection />
      </Suspense>
    </div>
  );
}
