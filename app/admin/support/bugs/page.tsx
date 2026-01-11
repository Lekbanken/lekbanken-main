'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  listBugReports,
  getBugReportStats,
  updateBugReportStatus,
  resolveBugReport,
} from '@/app/actions/bug-reports-admin';
import type { BugReportWithUser } from '@/app/actions/bug-reports-admin';
import { listTenantsForSupportHub } from '@/app/actions/support-hub';
import { checkSupportHubAccess } from '@/app/actions/support-hub';

export default function BugReportsAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<BugReportWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedReport, setSelectedReport] = useState<BugReportWithUser | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    open: number;
    investigating: number;
    resolved: number;
  } | null>(null);

  // Filters
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // --------------------------------------------------
  // Load data
  // --------------------------------------------------
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Check access
      const accessRes = await checkSupportHubAccess();
      if (!accessRes.hasAccess) {
        router.push('/admin');
        return;
      }
      setIsSystemAdmin(accessRes.isSystemAdmin ?? false);

      // Load tenants if system admin
      if (accessRes.isSystemAdmin) {
        const tenantsRes = await listTenantsForSupportHub();
        if (tenantsRes.success && tenantsRes.data) {
          setTenants(tenantsRes.data);
        }
      }

      // Load stats
      const statsRes = await getBugReportStats(selectedTenant !== 'all' ? selectedTenant : undefined);
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      // Load reports
      const reportsRes = await listBugReports({
        tenantId: selectedTenant !== 'all' ? selectedTenant : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      if (reportsRes.success && reportsRes.data) {
        setReports(reportsRes.data);
        setTotal(reportsRes.total ?? 0);
      }
    } catch (err) {
      console.error('Error loading bug reports:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, statusFilter, searchQuery, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------
  const handleStatusChange = async (id: string, status: string) => {
    const res = await updateBugReportStatus(id, status);
    if (res.success) {
      loadData();
      if (selectedReport?.id === id) {
        setSelectedReport({ ...selectedReport, status });
      }
    }
  };

  const handleResolve = async (id: string, resolved: boolean) => {
    const res = await resolveBugReport(id, resolved);
    if (res.success) {
      loadData();
      if (selectedReport?.id === id) {
        setSelectedReport({
          ...selectedReport,
          is_resolved: resolved,
          status: resolved ? 'resolved' : 'investigating',
        });
      }
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'investigating':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'wont_fix':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bug Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage bug reports submitted by users
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/support')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          ← Back to Hub
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Open</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-yellow-600">{stats.investigating}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Investigating</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Resolved</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {isSystemAdmin && tenants.length > 0 && (
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Tenants</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="wont_fix">Won&apos;t Fix</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex-1 min-w-[200px]"
        />
      </div>

      {/* List + Detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No bug reports found
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedReport?.id === report.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(report.status)}`}
                        >
                          {report.status}
                        </span>
                        {report.is_resolved && (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        )}
                      </div>
                      <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate">
                        {report.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {report.bug_report_key ?? 'No key'} • {report.user_email ?? 'Unknown user'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                        {report.game_title && ` • ${report.game_title}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {total > reports.length && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              Showing {reports.length} of {total} reports
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {selectedReport ? (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedReport.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedReport.bug_report_key ?? 'No key'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${getStatusColor(selectedReport.status)}`}
                >
                  {selectedReport.status}
                </span>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Reported by:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {selectedReport.user_email ?? 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {new Date(selectedReport.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedReport.tenant_name && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tenant:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedReport.tenant_name}
                    </span>
                  </div>
                )}
                {selectedReport.game_title && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Game:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedReport.game_title}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Description
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {selectedReport.description}
                </div>
              </div>

              {/* Error message */}
              {selectedReport.error_message && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Error Message
                  </h3>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-800 dark:text-red-300 font-mono text-sm whitespace-pre-wrap">
                    {selectedReport.error_message}
                  </div>
                </div>
              )}

              {/* Steps to reproduce */}
              {selectedReport.steps_to_reproduce && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Steps to Reproduce
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedReport.steps_to_reproduce}
                  </div>
                </div>
              )}

              {/* Browser info */}
              {selectedReport.browser_info && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Browser Info
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {selectedReport.browser_info}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <select
                  value={selectedReport.status}
                  onChange={(e) => handleStatusChange(selectedReport.id, e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="new">New</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="wont_fix">Won&apos;t Fix</option>
                </select>

                <button
                  onClick={() => handleResolve(selectedReport.id, !selectedReport.is_resolved)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedReport.is_resolved
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {selectedReport.is_resolved ? 'Reopen' : 'Mark Resolved'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Select a bug report to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
