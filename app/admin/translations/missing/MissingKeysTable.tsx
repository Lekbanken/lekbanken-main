/**
 * Missing Keys Table Component
 * 
 * Displays runtime-reported missing translation keys.
 * Part of Phase 5 enterprise features.
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TranslationMissingKey } from '@/features/admin/translations/enterprise-types';
import { LOCALE_FLAGS, type ContentLocale } from '@/features/admin/translations/content-types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, ClipboardIcon } from '@heroicons/react/24/outline';

interface MissingKeysTableProps {
  keys: TranslationMissingKey[];
  onResolve?: (keyId: string) => Promise<void>;
}

export function MissingKeysTable({ keys, onResolve }: MissingKeysTableProps) {
  const t = useTranslations('admin.translations.missing');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  
  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
  
  const handleSelectAll = () => {
    if (selectedIds.size === keys.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(keys.map(k => k.id)));
    }
  };
  
  const handleResolve = async (keyId: string) => {
    if (!onResolve) return;
    setResolvingIds(prev => new Set([...prev, keyId]));
    try {
      await onResolve(keyId);
    } finally {
      setResolvingIds(prev => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  if (keys.length === 0) {
    return (
      <div className="p-12 text-center">
        <CheckIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {t('noMissingKeys')}
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
          {t('allKeysFound')}
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('selected', { count: selectedIds.size })}
            </span>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())}>
              {t('deselect')}
            </Button>
            {onResolve && (
              <Button size="sm" variant="default">
                {t('markResolved')}
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === keys.length && keys.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('key')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('locale')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('namespace')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('occurrences')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('lastSeen')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {keys.map((key) => (
              <tr 
                key={key.id}
                className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                  selectedIds.has(key.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(key.id)}
                    onChange={() => handleToggleSelect(key.id)}
                    className="rounded border-zinc-300 dark:border-zinc-600"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded max-w-md truncate">
                      {key.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(key.key)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      title={t('copyKey')}
                    >
                      <ClipboardIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline">
                    {LOCALE_FLAGS[key.locale as ContentLocale]} {key.locale.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {key.namespace ? (
                    <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {key.namespace}
                    </code>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-medium ${
                    key.occurrence_count > 100 ? 'text-red-600' :
                    key.occurrence_count > 10 ? 'text-amber-600' :
                    'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {key.occurrence_count.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  {formatRelativeTime(new Date(key.last_seen))}
                </td>
                <td className="px-6 py-4 text-right">
                  {onResolve && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolve(key.id)}
                      disabled={resolvingIds.has(key.id)}
                    >
                      {resolvingIds.has(key.id) ? '...' : t('resolve')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just nu';
  if (diffMins < 60) return `${diffMins} min sedan`;
  if (diffHours < 24) return `${diffHours} timmar sedan`;
  if (diffDays < 7) return `${diffDays} dagar sedan`;
  return date.toLocaleDateString('sv-SE');
}
