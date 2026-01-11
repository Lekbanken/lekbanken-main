/**
 * Translation Audit Log Page
 * 
 * Shows history of all translation changes.
 * Part of Phase 5 enterprise features.
 */

import { getTranslations } from 'next-intl/server';
import { getAuditLog } from '@/features/admin/translations/enterprise-api.server';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import { ClockIcon, UserIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { LOCALE_FLAGS, type ContentLocale } from '@/features/admin/translations/content-types';
import type { TranslationAuditLogEntry } from '@/features/admin/translations/enterprise-types';

export const dynamic = 'force-dynamic';

const ACTION_ICONS: Record<string, typeof PlusIcon> = {
  create: PlusIcon,
  update: PencilIcon,
  delete: TrashIcon,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default async function AuditLogPage() {
  const t = await getTranslations('admin.translations');
  const { entries, total } = await getAuditLog({}, 100, 0);
  
  const tableLabels: Record<string, string> = {
    learning_course_translations: t('tables.learningCourseTranslations'),
    learning_path_translations: t('tables.learningPathTranslations'),
    achievement_translations: t('tables.achievementTranslations'),
    shop_item_translations: t('tables.shopItemTranslations'),
    notification_template_translations: t('tables.notificationTemplateTranslations'),
    tenant_translation_overrides: t('tables.tenantTranslationOverrides'),
  };

  const actionLabels: Record<string, string> = {
    create: t('actions.created'),
    update: t('actions.updated'),
    delete: t('actions.deleted'),
  };
  
  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('audit.title')}
        description={t('audit.description')}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: t('title'), href: '/admin/translations' },
          { label: t('audit.title') },
        ]}
      />
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <ClockIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('audit.totalChanges')}</p>
              <p className="text-2xl font-semibold">{total}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Audit Log Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">{t('audit.changeLog')}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {t('audit.showingRecent', { count: entries.length })}
          </p>
        </div>
        
        {entries.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {t('audit.noChangesYet')}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              {t('audit.changesWillAppear')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {entries.map((entry) => (
              <AuditLogEntry 
                key={entry.id} 
                entry={entry} 
                tableLabels={tableLabels}
                actionLabels={actionLabels}
                changedFieldsLabel={t('audit.changedFields')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface AuditLogEntryProps {
  entry: TranslationAuditLogEntry;
  tableLabels: Record<string, string>;
  actionLabels: Record<string, string>;
  changedFieldsLabel: string;
}

function AuditLogEntry({ entry, tableLabels, actionLabels, changedFieldsLabel }: AuditLogEntryProps) {
  const ActionIcon = ACTION_ICONS[entry.action] ?? PencilIcon;
  const actionColor = ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-800';
  const actionLabel = actionLabels[entry.action] ?? entry.action;
  const tableLabel = tableLabels[entry.table_name] ?? entry.table_name;
  
  return (
    <div className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
      <div className="flex items-start gap-4">
        {/* Action Icon */}
        <div className={`p-2 rounded-lg ${actionColor}`}>
          <ActionIcon className="h-4 w-4" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{actionLabel}</Badge>
            <span className="text-sm font-medium">{tableLabel}</span>
            {entry.locale && (
              <Badge variant="secondary">
                {LOCALE_FLAGS[entry.locale as ContentLocale] ?? ''} {entry.locale.toUpperCase()}
              </Badge>
            )}
          </div>
          
          {/* Changed fields */}
          {entry.changed_fields && entry.changed_fields.length > 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {changedFieldsLabel}: {entry.changed_fields.join(', ')}
            </p>
          )}
          
          {/* Diff preview for updates */}
          {entry.action === 'update' && entry.changed_fields && (
            <div className="mt-2 space-y-1">
              {entry.changed_fields.slice(0, 2).map((field) => {
                const oldVal = entry.old_value?.[field];
                const newVal = entry.new_value?.[field];
                return (
                  <div key={field} className="text-xs">
                    <span className="text-zinc-500">{field}:</span>{' '}
                    <span className="line-through text-red-500/70">{String(oldVal ?? '').slice(0, 50)}</span>
                    {' → '}
                    <span className="text-green-600">{String(newVal ?? '').slice(0, 50)}</span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Metadata */}
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
            {entry.user_name || entry.user_email ? (
              <span className="flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {entry.user_name ?? entry.user_email}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              {new Date(entry.created_at).toLocaleString('sv-SE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
