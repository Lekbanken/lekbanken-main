'use client';

/**
 * Tenant MFA Users Client Component
 * Interactive table for viewing and managing user MFA status
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface TenantMFAUsersClientProps {
  tenantId: string;
  canManage: boolean;
}

interface MFAUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  mfa_status: 'enabled' | 'required' | 'grace_period' | 'disabled';
  enrolled_at: string | null;
  grace_period_end: string | null;
  trusted_devices_count: number;
}

interface UsersResponse {
  users: MFAUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

type MFAStatusFilter = 'all' | 'enabled' | 'disabled' | 'required' | 'grace_period';

export default function TenantMFAUsersClient({ tenantId, canManage }: TenantMFAUsersClientProps) {
  const t = useTranslations('admin.tenant.security.mfa.users');
  const [users, setUsers] = useState<MFAUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MFAStatusFilter>('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [resettingUser, setResettingUser] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const res = await fetch(
        `/api/admin/tenant/${tenantId}/mfa/users?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error('Failed to load users');
      }

      const data: UsersResponse = await res.json();
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(t('empty.title'));
    } finally {
      setLoading(false);
    }
  }, [tenantId, page, pageSize, debouncedSearch, statusFilter, t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getStatusBadge = (status: MFAUser['mfa_status']) => {
    switch (status) {
      case 'enabled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            {t('status.enabled')}
          </span>
        );
      case 'required':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <ShieldExclamationIcon className="h-3.5 w-3.5" />
            {t('status.required')}
          </span>
        );
      case 'grace_period':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <ClockIcon className="h-3.5 w-3.5" />
            {t('status.gracePeriod')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {t('status.disabled')}
          </span>
        );
    }
  };

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, { label: string; color: string }> = {
      owner: { label: t('roles.owner'), color: 'purple' },
      admin: { label: t('roles.admin'), color: 'blue' },
      editor: { label: t('roles.editor'), color: 'indigo' },
      member: { label: t('roles.member'), color: 'gray' },
    };
    
    const config = roleLabels[role] ?? { label: role, color: 'gray' };
    
    const colorClasses: Record<string, string> = {
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[config.color]}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleResetMFA = async (userId: string, displayName: string | null) => {
    const userName = displayName || 'denna användare';
    const confirmed = window.confirm(
      `Är du säker på att du vill återställa MFA för ${userName}?\n\nDetta kommer att:\n• Ta bort alla MFA-faktorer\n• Återkalla alla betrodda enheter\n• Ge användaren en ny grace period för att konfigurera MFA igen`
    );
    
    if (!confirmed) return;
    
    setResettingUser(userId);
    
    try {
      const res = await fetch(`/api/admin/tenant/${tenantId}/mfa/users/${userId}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin-initiated reset from MFA users panel' }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset MFA');
      }
      
      // Reload users list to reflect the change
      await loadUsers();
    } catch (err) {
      console.error('Error resetting MFA:', err);
      alert(err instanceof Error ? err.message : 'Kunde inte återställa MFA');
    } finally {
      setResettingUser(null);
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">{error}</h3>
            <button
              onClick={loadUsers}
              className="mt-2 text-sm text-red-600 underline hover:no-underline dark:text-red-400"
            >
              {t('refresh')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as MFAStatusFilter);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">{t('filterAll')}</option>
            <option value="enabled">{t('filterEnabled')}</option>
            <option value="disabled">{t('filterDisabled')}</option>
            <option value="required">{t('filterRequired')}</option>
            <option value="grace_period">{t('filterGracePeriod')}</option>
          </select>
          
          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('columns.user')}
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('columns.role')}
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('columns.mfaStatus')}
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('columns.enrolledAt')}
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('columns.trustedDevices')}
              </th>
              {canManage && (
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t('columns.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {loading && users.length === 0 ? (
              // Loading skeleton
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="h-5 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {t('empty.title')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery || statusFilter !== 'all'
                      ? t('empty.description')
                      : t('empty.noUsersTitle')}
                  </p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                        <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.display_name || 'Anonym användare'}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <EnvelopeIcon className="h-3.5 w-3.5" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {getStatusBadge(user.mfa_status)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(user.enrolled_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {user.trusted_devices_count}
                  </td>
                  {canManage && (
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      {user.mfa_status === 'enabled' || user.mfa_status === 'grace_period' ? (
                        <button
                          onClick={() => handleResetMFA(user.user_id, user.display_name)}
                          disabled={resettingUser === user.user_id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          title={t('actions.resetMFA')}
                        >
                          {resettingUser === user.user_id ? (
                            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                          {t('actions.resetMFA')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('pagination.showing', { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total })}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              {t('pagination.previous')}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('pagination.page', { current: page, total: totalPages })}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t('pagination.next')}
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin actions info */}
      {canManage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tips:</strong> {t('tip.adminTip')}{' '}
            <a href={`/admin/tenant/${tenantId}/security/mfa`} className="underline hover:no-underline">{t('pageTitle')}</a>.
          </p>
        </div>
      )}
    </div>
  );
}
