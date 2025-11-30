'use client';

import React, { useEffect, useState } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { SparklesIcon } from '@heroicons/react/24/outline';
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <SparklesIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Personalization Analytics</h1>
          </div>
          <p className="text-muted-foreground">
            Monitor user preferences, interests, and recommendation performance
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 border-b border-border">
            {['preferences', 'interests', 'content', 'recommendations'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
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
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Loading preferences data...
                </CardContent>
              </Card>
            ) : preferenceStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{preferenceStats.totalUsers}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Language Preferences</CardTitle>
                      <p className="text-sm text-muted-foreground">Distribution across languages</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(preferenceStats.languageDistribution).map(([lang, count]) => (
                          <div key={lang} className="flex justify-between text-sm">
                            <span className="text-foreground">{lang}</span>
                            <span className="font-medium text-foreground">{(count as number)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Theme Preferences</CardTitle>
                      <p className="text-sm text-muted-foreground">Distribution across themes</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(preferenceStats.themeDistribution).map(([theme, count]) => (
                          <div key={theme} className="flex justify-between text-sm">
                            <span className="text-foreground">{theme}</span>
                            <span className="font-medium text-foreground">{(count as number)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Notification Settings</CardTitle>
                      <p className="text-sm text-muted-foreground">Email notification preferences</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(preferenceStats.notificationPreferences).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="text-foreground">{type}</span>
                            <span className="font-medium text-foreground">{(count as number)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Privacy Settings</CardTitle>
                      <p className="text-sm text-muted-foreground">Profile visibility settings</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(preferenceStats.privacySettings).map(([setting, count]) => (
                          <div key={setting} className="flex justify-between text-sm">
                            <span className="text-foreground">{setting}</span>
                            <span className="font-medium text-foreground">{(count as number)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No preference data available
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Interests Tab */}
        {activeTab === 'interests' && (
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Loading interest data...
                </CardContent>
              </Card>
            ) : interestStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Interest Profiles</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{interestStats.totalProfiles}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Top Interests</CardTitle>
                    <p className="text-sm text-muted-foreground">Most followed interest categories</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {interestStats.topInterests.map((interest, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0">
                          <div>
                            <p className="font-medium text-foreground">{interest.category}</p>
                            <p className="text-sm text-muted-foreground">Count: {interest.count}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">{(interest.avgWeight * 100).toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">Avg Weight</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Trending Categories</CardTitle>
                    <p className="text-sm text-muted-foreground">Categories with highest growth</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {interestStats.trendingCategories.map((trend, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-foreground">{trend.category}</span>
                          <span className={`font-medium ${trend.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.trend > 0 ? '+' : ''}
                            {(trend.trend * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No interest data available
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Content Preferences Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Loading content preference data...
                </CardContent>
              </Card>
            ) : contentStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Content Preferences</p>
                      <p className="mt-2 text-3xl font-bold text-foreground">{contentStats.totalPreferences}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Genre Distribution</CardTitle>
                    <p className="text-sm text-muted-foreground">User preferences by genre</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(contentStats.genreDistribution).map(([genre, count]) => (
                        <div key={genre} className="flex justify-between text-sm">
                          <span className="text-foreground">{genre}</span>
                          <span className="font-medium text-foreground">{(count as number)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Top Content Tags</CardTitle>
                    <p className="text-sm text-muted-foreground">Most engaged content tags</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {contentStats.topPreferences.map((pref, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-border pb-2 last:border-b-0">
                          <div>
                            <p className="font-medium text-foreground">{pref.tag}</p>
                            <p className="text-sm text-muted-foreground">Users: {pref.count}</p>
                          </div>
                          <div className="inline-block rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            {pref.engagementLevel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No content preference data available
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Loading recommendation data...
                </CardContent>
              </Card>
            ) : recommendationStats ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Total Recommendations</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{recommendationStats.totalRecommendations}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Click-Through Rate</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{(recommendationStats.clickThroughRate * 100).toFixed(1)}%</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{(recommendationStats.completionRate * 100).toFixed(1)}%</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{(recommendationStats.avgConfidenceScore * 100).toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Top Recommended Items</CardTitle>
                    <p className="text-sm text-muted-foreground">Most clicked and completed recommendations</p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-2 py-2 text-left text-foreground">Item Type</th>
                            <th className="px-2 py-2 text-left text-foreground">Item ID</th>
                            <th className="px-2 py-2 text-center text-foreground">Clicks</th>
                            <th className="px-2 py-2 text-center text-foreground">Completions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recommendationStats.topRecommendedItems.map((item, idx) => (
                            <tr key={idx} className="border-b border-border">
                              <td className="px-2 py-2 text-foreground">{item.itemType}</td>
                              <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{item.itemId.slice(0, 8)}...</td>
                              <td className="px-2 py-2 text-center text-foreground">{item.clicks}</td>
                              <td className="px-2 py-2 text-center text-foreground">{item.completions}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  No recommendation data available
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <button
          onClick={loadAnalytics}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Refresh Data
        </button>
        </div>
      </div>
    </div>
  );
}
