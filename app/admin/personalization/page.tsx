'use client';

import React, { useEffect, useState } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import * as personalizationService from '@/lib/services/personalizationService';

interface PreferenceStats {
  totalUsers: number;
  languageDistribution: Record<string, number>;
  themeDistribution: Record<string, number>;
  notificationPreferences: Record<string, number>;
  privacySettings: Record<string, number>;
}

interface InterestStats {
  topInterests: Array<{ category: string; count: number; avgWeight: number }>;
  trendingCategories: Array<{ category: string; trend: number }>;
  totalProfiles: number;
}

interface ContentStats {
  topPreferences: Array<{ tag: string; engagementLevel: string; count: number }>;
  genreDistribution: Record<string, number>;
  totalPreferences: number;
}

interface RecommendationStats {
  totalRecommendations: number;
  clickThroughRate: number;
  completionRate: number;
  avgConfidenceScore: number;
  topRecommendedItems: Array<{ itemId: string; itemType: string; clicks: number; completions: number }>;
}

export default function PersonalizationAdmin() {
  const { currentTenant } = useTenant();

  const [activeTab, setActiveTab] = useState('preferences');
  const [preferenceStats, setPreferenceStats] = useState<PreferenceStats | null>(null);
  const [interestStats, setInterestStats] = useState<InterestStats | null>(null);
  const [contentStats, setContentStats] = useState<ContentStats | null>(null);
  const [recommendationStats, setRecommendationStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = React.useCallback(async () => {
    if (!currentTenant?.id) return;
    setLoading(true);
    try {
      // Load all stats in parallel
      const [personalStats] = await Promise.all([
        personalizationService.getTenantPersonalizationStats(currentTenant.id),
      ]) as unknown as [Record<string, unknown> | null];

      if (personalStats) {
        // Parse preference stats
        const prefStats: PreferenceStats = {
          totalUsers: (personalStats.total_users as number) || 0,
          languageDistribution: (personalStats.languages as Record<string, number>) || {},
          themeDistribution: (personalStats.themes as Record<string, number>) || {},
          notificationPreferences: (personalStats.notifications as Record<string, number>) || {},
          privacySettings: (personalStats.privacy as Record<string, number>) || {},
        };
        setPreferenceStats(prefStats);

        // Parse interest stats
        const intStats: InterestStats = {
          topInterests: ((personalStats.top_interests as Array<Record<string, unknown>>) || []).map((i) => ({
            category: (i.category as string) || '',
            count: (i.count as number) || 0,
            avgWeight: (i.avg_weight as number) || 0,
          })),
          trendingCategories: ((personalStats.trending as Array<Record<string, unknown>>) || []).map((t) => ({
            category: (t.category as string) || '',
            trend: (t.trend as number) || 0,
          })),
          totalProfiles: (personalStats.total_profiles as number) || 0,
        };
        setInterestStats(intStats);

        // Parse content stats
        const contStats: ContentStats = {
          topPreferences: ((personalStats.top_content as Array<Record<string, unknown>>) || []).map((c) => ({
            tag: (c.tag as string) || '',
            engagementLevel: (c.engagement_level as string) || '',
            count: (c.count as number) || 0,
          })),
          genreDistribution: (personalStats.genres as Record<string, number>) || {},
          totalPreferences: (personalStats.total_content_prefs as number) || 0,
        };
        setContentStats(contStats);

        // Parse recommendation stats
        const recStats: RecommendationStats = {
          totalRecommendations: (personalStats.total_recommendations as number) || 0,
          clickThroughRate: (personalStats.ctr as number) || 0,
          completionRate: (personalStats.completion_rate as number) || 0,
          avgConfidenceScore: (personalStats.avg_confidence as number) || 0,
          topRecommendedItems: ((personalStats.top_recommended as Array<Record<string, unknown>>) || []).map((r) => ({
            itemId: (r.item_id as string) || '',
            itemType: (r.item_type as string) || '',
            clicks: (r.clicks as number) || 0,
            completions: (r.completions as number) || 0,
          })),
        };
        setRecommendationStats(recStats);
      }
    } catch (error) {
      console.error('Error loading personalization analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Personalization Analytics</h1>
        <p className="mt-2 text-gray-600">
          Monitor user preferences, interests, and recommendation performance
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          {['preferences', 'interests', 'content', 'recommendations'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'preferences' && 'User Preferences'}
              {tab === 'interests' && 'Interests'}
              {tab === 'content' && 'Content Prefs'}
              {tab === 'recommendations' && 'Recommendations'}
            </button>
          ))}
        </div>

        {/* User Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                Loading preferences data...
              </div>
            ) : preferenceStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded border bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="mt-2 text-3xl font-bold">{preferenceStats.totalUsers}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border bg-white p-4">
                    <h3 className="font-semibold">Language Preferences</h3>
                    <p className="text-sm text-gray-600">Distribution across languages</p>
                    <div className="mt-4 space-y-2">
                      {Object.entries(preferenceStats.languageDistribution).map(([lang, count]) => (
                        <div key={lang} className="flex justify-between text-sm">
                          <span>{lang}</span>
                          <span className="font-medium">{(count as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border bg-white p-4">
                    <h3 className="font-semibold">Theme Preferences</h3>
                    <p className="text-sm text-gray-600">Distribution across themes</p>
                    <div className="mt-4 space-y-2">
                      {Object.entries(preferenceStats.themeDistribution).map(([theme, count]) => (
                        <div key={theme} className="flex justify-between text-sm">
                          <span>{theme}</span>
                          <span className="font-medium">{(count as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border bg-white p-4">
                    <h3 className="font-semibold">Notification Settings</h3>
                    <p className="text-sm text-gray-600">Email notification preferences</p>
                    <div className="mt-4 space-y-2">
                      {Object.entries(preferenceStats.notificationPreferences).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span>{type}</span>
                          <span className="font-medium">{(count as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border bg-white p-4">
                    <h3 className="font-semibold">Privacy Settings</h3>
                    <p className="text-sm text-gray-600">Profile visibility settings</p>
                    <div className="mt-4 space-y-2">
                      {Object.entries(preferenceStats.privacySettings).map(([setting, count]) => (
                        <div key={setting} className="flex justify-between text-sm">
                          <span>{setting}</span>
                          <span className="font-medium">{(count as number)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                No preference data available
              </div>
            )}
          </div>
        )}

        {/* Interests Tab */}
        {activeTab === 'interests' && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                Loading interest data...
              </div>
            ) : interestStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border bg-white p-4">
                    <h3 className="font-semibold">Total Interest Profiles</h3>
                    <p className="mt-2 text-3xl font-bold">{interestStats.totalProfiles}</p>
                  </div>
                </div>

                <div className="rounded border bg-white p-4">
                  <h3 className="font-semibold">Top Interests</h3>
                  <p className="text-sm text-gray-600">Most followed interest categories</p>
                  <div className="mt-4 space-y-3">
                    {interestStats.topInterests.map((interest, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                        <div>
                          <p className="font-medium">{interest.category}</p>
                          <p className="text-sm text-gray-600">Count: {interest.count}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{(interest.avgWeight * 100).toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">Avg Weight</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded border bg-white p-4">
                  <h3 className="font-semibold">Trending Categories</h3>
                  <p className="text-sm text-gray-600">Categories with highest growth</p>
                  <div className="mt-4 space-y-2">
                    {interestStats.trendingCategories.map((trend, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{trend.category}</span>
                        <span className={`font-medium ${trend.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trend.trend > 0 ? '+' : ''}
                          {(trend.trend * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                No interest data available
              </div>
            )}
          </div>
        )}

        {/* Content Preferences Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                Loading content preference data...
              </div>
            ) : contentStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded border bg-white p-4">
                    <h3 className="font-semibold">Total Content Preferences</h3>
                    <p className="mt-2 text-3xl font-bold">{contentStats.totalPreferences}</p>
                  </div>
                </div>

                <div className="rounded border bg-white p-4">
                  <h3 className="font-semibold">Genre Distribution</h3>
                  <p className="text-sm text-gray-600">User preferences by genre</p>
                  <div className="mt-4 space-y-2">
                    {Object.entries(contentStats.genreDistribution).map(([genre, count]) => (
                      <div key={genre} className="flex justify-between text-sm">
                        <span>{genre}</span>
                        <span className="font-medium">{(count as number)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded border bg-white p-4">
                  <h3 className="font-semibold">Top Content Tags</h3>
                  <p className="text-sm text-gray-600">Most engaged content tags</p>
                  <div className="mt-4 space-y-3">
                    {contentStats.topPreferences.map((pref, idx) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                        <div>
                          <p className="font-medium">{pref.tag}</p>
                          <p className="text-sm text-gray-600">Users: {pref.count}</p>
                        </div>
                        <div className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                          {pref.engagementLevel}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                No content preference data available
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {loading ? (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                Loading recommendation data...
              </div>
            ) : recommendationStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded border bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Total Recommendations</p>
                    <p className="mt-2 text-2xl font-bold">{recommendationStats.totalRecommendations}</p>
                  </div>

                  <div className="rounded border bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Click-Through Rate</p>
                    <p className="mt-2 text-2xl font-bold">{(recommendationStats.clickThroughRate * 100).toFixed(1)}%</p>
                  </div>

                  <div className="rounded border bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="mt-2 text-2xl font-bold">{(recommendationStats.completionRate * 100).toFixed(1)}%</p>
                  </div>

                  <div className="rounded border bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                    <p className="mt-2 text-2xl font-bold">{(recommendationStats.avgConfidenceScore * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="rounded border bg-white p-4">
                  <h3 className="font-semibold">Top Recommended Items</h3>
                  <p className="text-sm text-gray-600">Most clicked and completed recommendations</p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-2 py-2 text-left">Item Type</th>
                          <th className="px-2 py-2 text-left">Item ID</th>
                          <th className="px-2 py-2 text-center">Clicks</th>
                          <th className="px-2 py-2 text-center">Completions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recommendationStats.topRecommendedItems.map((item, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-2 py-2">{item.itemType}</td>
                            <td className="px-2 py-2 font-mono text-xs">{item.itemId.slice(0, 8)}...</td>
                            <td className="px-2 py-2 text-center">{item.clicks}</td>
                            <td className="px-2 py-2 text-center">{item.completions}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded border bg-gray-50 p-6 text-center text-gray-600">
                No recommendation data available
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={loadAnalytics}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
      >
        Refresh Data
      </button>
    </div>
  );
}
