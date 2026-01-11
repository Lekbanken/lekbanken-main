'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  listFeedback,
  getFeedbackStats,
  updateFeedbackStatus,
} from '@/app/actions/feedback-admin';
import type { FeedbackWithUser } from '@/app/actions/feedback-admin';
import { listTenantsForSupportHub, checkSupportHubAccess } from '@/app/actions/support-hub';

export default function FeedbackAdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState<FeedbackWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithUser | null>(null);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    feature_request: number;
    bug: number;
    improvement: number;
    other: number;
    averageRating: number | null;
  } | null>(null);

  // Filters
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
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
      const statsRes = await getFeedbackStats(selectedTenant !== 'all' ? selectedTenant : undefined);
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }

      // Load feedback
      const feedbackRes = await listFeedback({
        tenantId: selectedTenant !== 'all' ? selectedTenant : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchQuery || undefined,
      });
      if (feedbackRes.success && feedbackRes.data) {
        setFeedbackList(feedbackRes.data);
        setTotal(feedbackRes.total ?? 0);
      }
    } catch (err) {
      console.error('Error loading feedback:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTenant, typeFilter, statusFilter, searchQuery, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------
  const handleStatusChange = async (id: string, status: string) => {
    const res = await updateFeedbackStatus(id, status);
    if (res.success) {
      loadData();
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, status });
      }
    }
  };

  // --------------------------------------------------
  // Render helpers
  // --------------------------------------------------
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'compliment':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'complaint':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'question':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'reviewed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'actioned':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const renderStars = (rating: number | null) => {
    if (rating === null) return null;
    return (
      <span className="text-yellow-500">
        {'★'.repeat(rating)}
        {'☆'.repeat(5 - rating)}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Feedback</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Review feedback submitted by users
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600">{stats.feature_request}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Feature Requests</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-red-600">{stats.bug}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Bugs</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">{stats.improvement}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Improvements</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{stats.other}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Other</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.averageRating ? stats.averageRating.toFixed(1) : '—'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</div>
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
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Types</option>
          <option value="suggestion">Suggestion</option>
          <option value="compliment">Compliment</option>
          <option value="complaint">Complaint</option>
          <option value="question">Question</option>
          <option value="other">Other</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Statuses</option>
          <option value="received">Received</option>
          <option value="reviewed">Reviewed</option>
          <option value="actioned">Actioned</option>
          <option value="archived">Archived</option>
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
            {feedbackList.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No feedback found
              </div>
            ) : (
              feedbackList.map((fb) => (
                <div
                  key={fb.id}
                  onClick={() => setSelectedFeedback(fb)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedFeedback?.id === fb.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(fb.type)}`}
                        >
                          {fb.type}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(fb.status)}`}
                        >
                          {fb.status}
                        </span>
                        {fb.rating && <span className="text-yellow-500 text-sm">{renderStars(fb.rating)}</span>}
                      </div>
                      <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100 truncate">
                        {fb.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {fb.is_anonymous ? 'Anonymous' : fb.user_email ?? 'Unknown user'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(fb.created_at).toLocaleDateString()}
                        {fb.game_title && ` • ${fb.game_title}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {total > feedbackList.length && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              Showing {feedbackList.length} of {total} items
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {selectedFeedback ? (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedFeedback.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedFeedback.feedback_key ?? 'No key'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${getTypeColor(selectedFeedback.type)}`}
                  >
                    {selectedFeedback.type}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${getStatusColor(selectedFeedback.status)}`}
                  >
                    {selectedFeedback.status}
                  </span>
                </div>
              </div>

              {/* Rating */}
              {selectedFeedback.rating && (
                <div className="text-2xl">{renderStars(selectedFeedback.rating)}</div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Submitted by:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {selectedFeedback.is_anonymous
                      ? 'Anonymous'
                      : selectedFeedback.user_email ?? 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-gray-100">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedFeedback.tenant_name && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tenant:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedFeedback.tenant_name}
                    </span>
                  </div>
                )}
                {selectedFeedback.game_title && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Game:</span>
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {selectedFeedback.game_title}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedFeedback.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Description
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {selectedFeedback.description}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <select
                  value={selectedFeedback.status}
                  onChange={(e) => handleStatusChange(selectedFeedback.id, e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="received">Received</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="actioned">Actioned</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Select feedback to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
