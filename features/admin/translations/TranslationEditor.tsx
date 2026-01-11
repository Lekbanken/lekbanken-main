/**
 * Content Translation Editor for Individual Items
 * 
 * Side-by-side translation editor for a single content item.
 * Shows original values and allows editing translations per locale.
 */

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AdminPageHeader } from '@/components/admin/shared/AdminPageHeader';
import {
  type ContentDomain,
  type ContentLocale,
  CONTENT_LOCALES,
  LOCALE_LABELS,
  LOCALE_FLAGS,
} from '@/features/admin/translations/content-types';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

interface TranslationField {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  required?: boolean;
}

interface TranslationEditorProps {
  domain: ContentDomain;
  itemName: string;
  fields: TranslationField[];
  originalValues: Record<string, string | null>;
  translations: Record<ContentLocale, Record<string, string | null> | null>;
  onSave: (locale: ContentLocale, values: Record<string, string | null>) => Promise<void>;
  onDelete: (locale: ContentLocale) => Promise<void>;
}

export function TranslationEditor({
  domain,
  itemName,
  fields,
  originalValues,
  translations,
  onSave,
  onDelete,
}: TranslationEditorProps) {
  const router = useRouter();
  const t = useTranslations('admin.translations');
  const [, startTransition] = useTransition();
  const [activeLocale, setActiveLocale] = useState<ContentLocale>('en');
  const [values, setValues] = useState<Record<ContentLocale, Record<string, string>>>(() => {
    const initial: Record<ContentLocale, Record<string, string>> = {
      sv: {},
      en: {},
      no: {},
    };
    
    for (const locale of CONTENT_LOCALES) {
      const trans = translations[locale];
      for (const field of fields) {
        initial[locale][field.key] = trans?.[field.key] ?? '';
      }
    }
    
    return initial;
  });
  const [saveStatus, setSaveStatus] = useState<Record<ContentLocale, 'idle' | 'saving' | 'saved' | 'error'>>({
    sv: 'idle',
    en: 'idle',
    no: 'idle',
  });

  const handleFieldChange = (locale: ContentLocale, field: string, value: string) => {
    setValues(prev => ({
      ...prev,
      [locale]: {
        ...prev[locale],
        [field]: value,
      },
    }));
    setSaveStatus(prev => ({ ...prev, [locale]: 'idle' }));
  };

  const handleSave = async (locale: ContentLocale) => {
    setSaveStatus(prev => ({ ...prev, [locale]: 'saving' }));
    
    try {
      const localeValues: Record<string, string | null> = {};
      for (const field of fields) {
        const val = values[locale][field.key]?.trim();
        localeValues[field.key] = val || null;
      }
      
      await onSave(locale, localeValues);
      setSaveStatus(prev => ({ ...prev, [locale]: 'saved' }));
      
      startTransition(() => {
        router.refresh();
      });
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [locale]: 'idle' }));
      }, 2000);
    } catch (error) {
      console.error('Failed to save translation:', error);
      setSaveStatus(prev => ({ ...prev, [locale]: 'error' }));
    }
  };

  const handleDelete = async (locale: ContentLocale) => {
    if (!confirm(`Är du säker på att du vill ta bort översättningen för ${LOCALE_LABELS[locale]}?`)) {
      return;
    }
    
    try {
      await onDelete(locale);
      setValues(prev => ({
        ...prev,
        [locale]: Object.fromEntries(fields.map(f => [f.key, ''])),
      }));
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('Failed to delete translation:', error);
    }
  };

  const hasTranslation = (locale: ContentLocale) => translations[locale] != null;
  const hasChanges = (locale: ContentLocale) => {
    const trans = translations[locale];
    return fields.some(f => {
      const current = values[locale][f.key]?.trim() || null;
      const original = trans?.[f.key] || null;
      return current !== original;
    });
  };

  const domainLabels: Record<ContentDomain, string> = {
    learning_courses: t('domains.learningCourses'),
    learning_paths: t('domains.learningPaths'),
    achievements: t('domains.achievements'),
    shop_items: t('domains.shopItems'),
    notification_templates: t('domains.notificationTemplates'),
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('editor.translateTitle', { name: itemName })}
        description={t('editor.editTranslationsDescription')}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: t('title'), href: '/admin/translations' },
          { label: t('content.title'), href: '/admin/translations/content' },
          { label: domainLabels[domain], href: `/admin/translations/content/${domain}` },
          { label: itemName },
        ]}
      />
      
      {/* Back link */}
      <Link
        href={`/admin/translations/content/${domain}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Tillbaka till {domainLabels[domain].toLowerCase()}
      </Link>
      
      {/* Locale tabs */}
      <div className="flex gap-2 border-b border-border">
        {CONTENT_LOCALES.map((locale) => (
          <button
            key={locale}
            onClick={() => setActiveLocale(locale)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeLocale === locale
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <span>{LOCALE_FLAGS[locale]}</span>
            <span>{LOCALE_LABELS[locale]}</span>
            {hasTranslation(locale) ? (
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            ) : (
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
            )}
          </button>
        ))}
      </div>
      
      {/* Editor grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Original (Swedish base) */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span>🇸🇪</span>
            {t('editor.original')}
          </h3>
          <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <div className="rounded-md bg-background border border-border p-3 text-sm text-foreground min-h-[80px] whitespace-pre-wrap">
                    {originalValues[field.key] || <span className="text-muted-foreground italic">{t('editor.empty')}</span>}
                  </div>
                ) : (
                  <div className="rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground">
                    {originalValues[field.key] || <span className="text-muted-foreground italic">{t('editor.empty')}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Translation editor */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span>{LOCALE_FLAGS[activeLocale]}</span>
            {t('editor.translation')} ({LOCALE_LABELS[activeLocale]})
          </h3>
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={values[activeLocale][field.key] || ''}
                    onChange={(e) => handleFieldChange(activeLocale, field.key, e.target.value)}
                    placeholder={originalValues[field.key] || `Ange ${field.label.toLowerCase()}...`}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] resize-y"
                    rows={4}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[activeLocale][field.key] || ''}
                    onChange={(e) => handleFieldChange(activeLocale, field.key, e.target.value)}
                    placeholder={originalValues[field.key] || `Ange ${field.label.toLowerCase()}...`}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                )}
              </div>
            ))}
            
            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                {hasTranslation(activeLocale) && (
                  <button
                    onClick={() => handleDelete(activeLocale)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    {t('editor.deleteTranslation')}
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                {saveStatus[activeLocale] === 'saved' && (
                  <span className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" />
                    {t('editor.saved')}
                  </span>
                )}
                {saveStatus[activeLocale] === 'error' && (
                  <span className="text-sm text-red-600">
                    {t('editor.couldNotSave')}
                  </span>
                )}
                <button
                  onClick={() => handleSave(activeLocale)}
                  disabled={saveStatus[activeLocale] === 'saving' || (!hasChanges(activeLocale) && hasTranslation(activeLocale))}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveStatus[activeLocale] === 'saving' ? t('editor.saving') : t('editor.saveTranslation')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
