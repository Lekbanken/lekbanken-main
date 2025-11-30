'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import {
  getPageViewStats,
  getTopPages,
  getSessionStats,
  getTopFeatures,
  getErrorStats,
  getTopErrors,
} from '@/lib/services/analyticsService';

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = Date.now();
    return {
      startDate: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(now).toISOString().split('T')[0],
    };
  });

  // Analytics data
  const [pageViewStats, setPageViewStats] = useState<{ total: number; unique: number; avgDuration: number } | null>(null);
  const [topPages, setTopPages] = useState<Array<{ path: string; views: number; avgDuration: number }>>([]);
  const [sessionStats, setSessionStats] = useState<{
    totalSessions: number;
    completedSessions: number;
    avgDuration: number;
    avgScore: number;
  } | null>(null);
  const [topFeatures, setTopFeatures] = useState<Array<{ name: string; usage: number; successRate: number }>>([]);
  const [errorStats, setErrorStats] = useState<{ totalErrors: number; uniqueTypes: number; unresolvedCount: number } | null>(null);
  const [topErrors, setTopErrors] = useState<Array<{ type: string; message: string; count: number }>>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'features' | 'errors'>('overview');

  // Load analytics data
  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadData = async () => {
      setIsLoading(true);

      const startDateISO = new Date(dateRange.startDate).toISOString();
      const endDateISO = new Date(new Date(dateRange.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const [pageStats, pages, sessions, features, errors, errorList] = await Promise.all([
        getPageViewStats(currentTenant.id, startDateISO, endDateISO),
        getTopPages(currentTenant.id, 5),
        getSessionStats(currentTenant.id, startDateISO, endDateISO),
        getTopFeatures(currentTenant.id, 5),
        getErrorStats(currentTenant.id, startDateISO, endDateISO),
        getTopErrors(currentTenant.id, 5),
      ]);

      if (pageStats) setPageViewStats(pageStats);
      if (pages) setTopPages(pages);
      if (sessions) setSessionStats(sessions);
      if (features) setTopFeatures(features);
      if (errors) setErrorStats(errors);
      if (errorList) setTopErrors(errorList);

      setIsLoading(false);
    };

    loadData();
  }, [user, currentTenant, dateRange]);

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Analytics</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-600">Spåra användarbeteende, engagement och prestanda</p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Från</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Till</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg shadow p-2">
          {(['overview', 'pages', 'features', 'errors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'overview' && '📊 Överblick'}
              {tab === 'pages' && '📄 Sidor'}
              {tab === 'features' && '⚙️ Funktioner'}
              {tab === 'errors' && '❌ Fel'}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Laddar analytics...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Top Stats */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Page Views */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-slate-600 text-sm font-medium mb-1">Sidvisningar</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {pageViewStats?.total.toLocaleString() || '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {pageViewStats?.unique} unika besökare
                    </p>
                  </div>

                  {/* Sessions */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-slate-600 text-sm font-medium mb-1">Sessioner</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {sessionStats?.totalSessions.toLocaleString() || '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {sessionStats?.completedSessions} slutförda
                    </p>
                  </div>

                  {/* Avg Session Duration */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-slate-600 text-sm font-medium mb-1">Genomsnittlig Varaktighet</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {sessionStats?.avgDuration ? `${Math.round(sessionStats.avgDuration / 60)}m` : '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">per session</p>
                  </div>

                  {/* Errors */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-slate-600 text-sm font-medium mb-1">Fel Rapporterade</p>
                    <p className="text-3xl font-bold text-red-600">
                      {errorStats?.totalErrors || '-'}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {errorStats?.unresolvedCount} olösta
                    </p>
                  </div>
                </div>

                {/* Top Pages & Features */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top Pages */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                      <h3 className="text-lg font-bold text-white">Populäraste Sidor</h3>
                    </div>
                    <div className="divide-y">
                      {topPages.length === 0 ? (
                        <p className="p-4 text-slate-600 text-sm">Ingen data tillgänglig</p>
                      ) : (
                        topPages.map((page, idx) => (
                          <div key={idx} className="p-4 hover:bg-slate-50">
                            <p className="font-medium text-slate-900 truncate">{page.path}</p>
                            <div className="flex justify-between text-sm text-slate-600 mt-1">
                              <span>{page.views.toLocaleString()} visningar</span>
                              <span>Ø {page.avgDuration}s</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Features */}
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                      <h3 className="text-lg font-bold text-white">Mest Använda Funktioner</h3>
                    </div>
                    <div className="divide-y">
                      {topFeatures.length === 0 ? (
                        <p className="p-4 text-slate-600 text-sm">Ingen data tillgänglig</p>
                      ) : (
                        topFeatures.map((feature, idx) => (
                          <div key={idx} className="p-4 hover:bg-slate-50">
                            <p className="font-medium text-slate-900">{feature.name}</p>
                            <div className="flex justify-between text-sm text-slate-600 mt-1">
                              <span>{feature.usage.toLocaleString()} användningar</span>
                              <span className={feature.successRate === 100 ? 'text-green-600' : 'text-yellow-600'}>
                                {feature.successRate}% framgång
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pages Tab */}
            {activeTab === 'pages' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                  <h2 className="text-lg font-bold text-white">Detaljerade Sidstatistik</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Sida</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Visningar</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Genomsnittlig Varaktighet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topPages.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-slate-600">
                            Ingen data tillgänglig
                          </td>
                        </tr>
                      ) : (
                        topPages.map((page, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-6 py-4 font-medium text-slate-900 truncate">{page.path}</td>
                            <td className="px-6 py-4 text-right text-slate-600">{page.views.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-slate-600">{page.avgDuration}s</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === 'features' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                    <h2 className="text-lg font-bold text-white">Funktionsadoption</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Funktion</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Användningar</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Framgångsgrad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topFeatures.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 text-center text-slate-600">
                              Ingen data tillgänglig
                            </td>
                          </tr>
                        ) : (
                          topFeatures.map((feature, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-900">{feature.name}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{feature.usage.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right">
                                <span
                                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    feature.successRate === 100
                                      ? 'bg-green-100 text-green-700'
                                      : feature.successRate >= 80
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {feature.successRate}%
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Errors Tab */}
            {activeTab === 'errors' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
                  <h2 className="text-lg font-bold text-white">Fel & Problem</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Typ</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase">Meddelande</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase">Förekomster</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {topErrors.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-slate-600">
                            Inga fel rapporterade
                          </td>
                        </tr>
                      ) : (
                        topErrors.map((error, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                {error.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-900 truncate">{error.message}</td>
                            <td className="px-6 py-4 text-right text-slate-600 font-medium">{error.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
