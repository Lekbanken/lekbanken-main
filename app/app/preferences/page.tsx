'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import * as personalizationService from '@/lib/services/personalizationService';

interface UserPreferences {
  language: string;
  theme: string;
  email_frequency: string;
  notifications_enabled: boolean;
  content_maturity_level: string;
  profile_visibility: string;
  enable_recommendations: boolean;
  recommendation_frequency: string;
}

export default function PreferencesPage() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const userId = user?.id;

  const [preferences, setPreferences] = useState<UserPreferences>({
    language: 'en',
    theme: 'light',
    email_frequency: 'weekly',
    notifications_enabled: true,
    content_maturity_level: 'all',
    profile_visibility: 'public',
    enable_recommendations: true,
    recommendation_frequency: 'weekly',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    if (!currentTenant?.id || !userId) return;
    setLoading(true);
    try {
      const prefs = await personalizationService.getUserPreferences(currentTenant.id, userId);
      if (prefs) {
        setPreferences({
          language: (prefs.language as string) || 'en',
          theme: (prefs.theme as string) || 'light',
          email_frequency: (prefs.email_frequency as string) || 'weekly',
          notifications_enabled: (prefs.notifications_enabled as boolean) !== false,
          content_maturity_level: (prefs.content_maturity_level as string) || 'all',
          profile_visibility: (prefs.profile_visibility as string) || 'public',
          enable_recommendations: (prefs.enable_recommendations as boolean) !== false,
          recommendation_frequency: (prefs.recommendation_frequency as string) || 'weekly',
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  async function savePreferences() {
    if (!currentTenant?.id || !userId) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await personalizationService.updateUserPreferences(currentTenant.id, userId, preferences as any);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-600">Loading your preferences...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your preferences and notification settings
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">Display</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Preferred Language
            </label>
            <select
              id="language"
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="en">English</option>
              <option value="sv">Swedish</option>
              <option value="de">Deutsch</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
              <option value="pt">Português</option>
            </select>
          </div>

          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700">
              Color Theme
            </label>
            <div className="mt-2 space-y-2">
              {['light', 'dark', 'auto'].map((themeOption) => (
                <label key={themeOption} className="flex items-center">
                  <input
                    type="radio"
                    name="theme"
                    value={themeOption}
                    checked={preferences.theme === themeOption}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                    className="h-4 w-4"
                  />
                  <span className="ml-2 capitalize text-gray-700">{themeOption}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="maturity" className="block text-sm font-medium text-gray-700">
              Content Maturity Level
            </label>
            <select
              id="maturity"
              value={preferences.content_maturity_level}
              onChange={(e) => setPreferences({ ...preferences, content_maturity_level: e.target.value })}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Ages</option>
              <option value="teen">13+ (Teen)</option>
              <option value="mature">17+ (Mature)</option>
              <option value="adult">18+ (Adult)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">Notifications</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.notifications_enabled}
              onChange={(e) => setPreferences({ ...preferences, notifications_enabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="ml-3 text-gray-700">Enable email notifications</span>
          </label>

          <div>
            <label htmlFor="email-frequency" className="block text-sm font-medium text-gray-700">
              Email Frequency
            </label>
            <select
              id="email-frequency"
              value={preferences.email_frequency}
              onChange={(e) => setPreferences({ ...preferences, email_frequency: e.target.value })}
              disabled={!preferences.notifications_enabled}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="immediate">Immediately</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
              <option value="monthly">Monthly Digest</option>
              <option value="never">Never</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">Recommendations</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.enable_recommendations}
              onChange={(e) => setPreferences({ ...preferences, enable_recommendations: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="ml-3 text-gray-700">Receive personalized recommendations</span>
          </label>

          <div>
            <label htmlFor="rec-frequency" className="block text-sm font-medium text-gray-700">
              Recommendation Frequency
            </label>
            <select
              id="rec-frequency"
              value={preferences.recommendation_frequency}
              onChange={(e) => setPreferences({ ...preferences, recommendation_frequency: e.target.value })}
              disabled={!preferences.enable_recommendations}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-semibold">Privacy</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700">
              Profile Visibility
            </label>
            <select
              id="visibility"
              value={preferences.profile_visibility}
              onChange={(e) => setPreferences({ ...preferences, profile_visibility: e.target.value })}
              className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="public">Public</option>
              <option value="friends">Friends Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <p className="text-xs text-gray-600">
            Your personalization data is always kept private. We use it only to improve your recommendations and experience.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <div className="flex items-center text-green-600">✓ Changes saved</div>}
      </div>
    </div>
  );
}
