/**
 * Admin Support Automation Page
 * 
 * Manage routing rules, notification templates, and SLA settings.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { checkIsSystemAdmin } from '@/app/actions/tickets-admin';
import { 
  listRoutingRules, 
  listNotificationTemplates,
  runSlaEscalation,
} from '@/app/actions/support-automation';
import { 
  Badge, 
  Button, 
  Table, 
  TableHeader,
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui';
import { 
  CogIcon, 
  BellIcon, 
  ClockIcon,
  PlusIcon,
  PlayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Simple heading components to avoid @headlessui/react dependency
function Heading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h1 className={`text-2xl font-semibold text-zinc-950 dark:text-white ${className}`}>{children}</h1>;
}

function Subheading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-base font-semibold text-zinc-950 dark:text-white ${className}`}>{children}</h2>;
}

function Text({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-base text-zinc-500 dark:text-zinc-400 ${className}`}>{children}</p>;
}

export const metadata: Metadata = {
  title: 'Automation | Support Admin',
  description: 'Hantera routingregler, notifikationsmallar och SLA-inställningar',
};

// ============================================
// ESCALATION BUTTON COMPONENT
// ============================================

async function EscalationButton() {
  const t = await getTranslations('admin.support.automation');
  
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
      <Button type="submit" variant="primary" className="gap-2">
        <PlayIcon className="h-4 w-4" />
        {t('runSlaEscalation')}
      </Button>
    </form>
  );
}

// ============================================
// ROUTING RULES TABLE
// ============================================

async function RoutingRulesSection() {
  const t = await getTranslations('admin.support.automation');
  const result = await listRoutingRules();
  const rules = result.data || [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CogIcon className="h-6 w-6 text-zinc-500" />
          <Subheading>{t('routingRules.title')}</Subheading>
        </div>
        <Button href="/admin/support/automation/rules/new" variant="default" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('routingRules.newRule')}
        </Button>
      </div>
      
      <Text>
        {t('routingRules.description')}
      </Text>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
          <CogIcon className="mx-auto h-12 w-12 text-zinc-400" />
          <Text className="mt-2">{t('routingRules.noRulesYet')}</Text>
          <Button 
            href="/admin/support/automation/rules/new" 
            variant="default" 
            className="mt-4 gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            {t('routingRules.createFirstRule')}
          </Button>
        </div>
      ) : (
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.name')}</TableHead>
              <TableHead>{t('table.match')}</TableHead>
              <TableHead>{t('table.action')}</TableHead>
              <TableHead>{t('table.priority')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/support/automation/rules/${rule.id}`} className="hover:underline">
                    {rule.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {rule.match_category && (
                      <Badge variant="primary">{t('match.category')}: {rule.match_category}</Badge>
                    )}
                    {rule.match_priority && (
                      <Badge variant="warning">{t('match.priority')}: {rule.match_priority}</Badge>
                    )}
                    {!rule.match_category && !rule.match_priority && (
                      <Badge variant="default">{t('match.allTickets')}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {rule.assign_to_user_email && (
                      <Badge variant="success">→ {rule.assign_to_user_email}</Badge>
                    )}
                    {rule.set_priority && (
                      <Badge variant="warning">{t('match.priority')}: {rule.set_priority}</Badge>
                    )}
                    {rule.set_sla_hours && (
                      <Badge variant="accent">SLA: {rule.set_sla_hours}h</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{rule.priority_order}</TableCell>
                <TableCell>
                  <Badge variant={rule.is_active ? 'success' : 'default'}>
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
  const t = await getTranslations('admin.support.automation');
  const result = await listNotificationTemplates({ includeSystem: true });
  const templates = result.data || [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellIcon className="h-6 w-6 text-zinc-500" />
          <Subheading>{t('templates.title')}</Subheading>
        </div>
        <Button href="/admin/support/automation/templates/new" variant="default" className="gap-2">
          <PlusIcon className="h-4 w-4" />
          {t('templates.newTemplate')}
        </Button>
      </div>
      
      <Text>
        {t('templates.description')}
      </Text>

      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Namn</TableHead>
            <TableHead>Nyckel</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Typ</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">
                {template.is_system ? (
                  <>
                    {template.name}
                    <Badge variant="primary" className="ml-2">System</Badge>
                  </>
                ) : (
                  <Link href={`/admin/support/automation/templates/${template.id}`} className="hover:underline">
                    {template.name}
                  </Link>
                )}
              </TableCell>
              <TableCell>
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                  {template.template_key}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant="default">{template.category}</Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={
                    template.type === 'error' ? 'destructive' :
                    template.type === 'warning' ? 'warning' :
                    template.type === 'success' ? 'success' :
                    'primary'
                  }
                >
                  {template.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={template.is_active ? 'success' : 'default'}>
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
  const t = await getTranslations('admin.support.automation');
  const isAdmin = await checkIsSystemAdmin();

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <ClockIcon className="h-6 w-6 text-zinc-500" />
        <Subheading>{t('sla.title')}</Subheading>
      </div>
      
      <Text>
        {t('sla.description')}
      </Text>

      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Text className="text-sm text-zinc-500">{t('sla.escalationSteps')}</Text>
            <Text className="text-lg font-semibold">
              low → medium → high → urgent
            </Text>
          </div>
          <div>
            <Text className="text-sm text-zinc-500">{t('sla.minTimeBetween')}</Text>
            <Text className="text-lg font-semibold">{t('sla.oneHour')}</Text>
          </div>
          <div>
            <Text className="text-sm text-zinc-500">{t('sla.autoRun')}</Text>
            <Text className="text-lg font-semibold">{t('sla.everyHour')}</Text>
          </div>
          <div>
            <Text className="text-sm text-zinc-500">{t('table.status')}</Text>
            <Badge variant="success">{t('status.active')}</Badge>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 flex items-center gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
            <EscalationButton />
            <Text className="text-sm text-zinc-500">
              {t('sla.manualRunDescription')}
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
  const t = await getTranslations('admin.support.automation');
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
          <Heading>{t('title')}</Heading>
          <Text className="mt-1">
            {t('pageDescription')}
          </Text>
        </div>
        <Button href="/admin/support" variant="outline" className="gap-2">
          <ArrowPathIcon className="h-4 w-4" />
          {t('backToSupport')}
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
