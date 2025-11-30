'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { supabase } from '@/lib/supabase/client';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  subscription_tier: string;
  subscription_status: string;
  created_at: string;
  member_count: number;
  game_count: number;
  session_count: number;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // States
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Load tenant info
  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadTenantInfo = async () => {
      setIsLoading(true);
      try {
        // Get tenant basic info
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', currentTenant.id)
          .single();

        if (tenantError) {
          console.error('Error loading tenant:', tenantError);
          return;
        }

        // Get member count
        const { count: memberCount } = await supabase
          .from('user_tenant_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id);

        // Get game count
        const { count: gameCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('owner_tenant_id', currentTenant.id);

        // Get session count
        const { count: sessionCount } = await supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id);

        setTenantInfo({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug || '',
          description: tenant.description || '',
          logo_url: tenant.logo_url || '',
          subscription_tier: tenant.subscription_tier || 'free',
          subscription_status: tenant.subscription_status || 'active',
          created_at: tenant.created_at,
          member_count: memberCount || 0,
          game_count: gameCount || 0,
          session_count: sessionCount || 0,
        });

        setEditValues({
          name: tenant.name,
          description: tenant.description || '',
        });
      } catch (err) {
        console.error('Error loading tenant info:', err);
      }
      setIsLoading(false);
    };

    loadTenantInfo();
  }, [user, currentTenant]);

  const handleSaveChanges = async () => {
    if (!currentTenant || !tenantInfo) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: editValues.name,
          description: editValues.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentTenant.id);

      if (error) {
        console.error('Error updating tenant:', error);
        alert('Det gick inte att uppdatera organisationen.');
      } else {
        setTenantInfo({
          ...tenantInfo,
          name: editValues.name,
          description: editValues.description,
        });
        setIsEditing(false);
        alert('Organisationen har uppdaterats.');
      }
    } catch (err) {
      console.error('Error updating tenant:', err);
      alert('Det gick inte att uppdatera organisationen.');
    }
    setIsSaving(false);
  };

  if (!user || !currentTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Organization Settings</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Organization Settings</h1>
          <p className="text-slate-600">Hantera organisationsinställningar och information</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Laddar...</p>
          </div>
        ) : tenantInfo ? (
          <div className="space-y-6">
            {/* Organization Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-slate-600 text-sm font-medium mb-1">Medlemmar</p>
                <p className="text-3xl font-bold text-slate-900">{tenantInfo.member_count}</p>
                <p className="text-xs text-slate-500 mt-2">i organisationen</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-slate-600 text-sm font-medium mb-1">Spel</p>
                <p className="text-3xl font-bold text-slate-900">{tenantInfo.game_count}</p>
                <p className="text-xs text-slate-500 mt-2">tillgängliga</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-slate-600 text-sm font-medium mb-1">Gamesessioner</p>
                <p className="text-3xl font-bold text-slate-900">{tenantInfo.session_count.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">totalt</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-slate-600 text-sm font-medium mb-1">Prenumerationsstatus</p>
                <p className="text-lg font-bold text-slate-900 capitalize mb-2">{tenantInfo.subscription_tier}</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tenantInfo.subscription_status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {tenantInfo.subscription_status === 'active' ? 'Aktiv' : 'Auktoriserad'}
                </span>
              </div>
            </div>

            {/* Organization Info */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Organisationsinformation</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
                  >
                    Redigera
                  </button>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Organisationsnamn
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-slate-900">{tenantInfo.name}</p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Slug (URL-vänlig)
                  </label>
                  <p className="text-slate-600 text-sm">{tenantInfo.slug}</p>
                  <p className="text-xs text-slate-500 mt-1">Kan inte ändras efter skapande</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Beskrivning
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editValues.description}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  ) : (
                    <p className="text-slate-600">{tenantInfo.description || '-'}</p>
                  )}
                </div>

                {/* Created */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Skapad
                  </label>
                  <p className="text-slate-600 text-sm">
                    {new Date(tenantInfo.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>

                {/* Tenant ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Organisation ID
                  </label>
                  <p className="text-slate-600 text-sm break-all font-mono text-xs">{tenantInfo.id}</p>
                </div>

                {/* Save/Cancel Buttons */}
                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-slate-200 mt-6">
                    <button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg font-medium transition-colors"
                    >
                      {isSaving ? 'Sparar...' : 'Spara Ändringar'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditValues({
                          name: tenantInfo.name,
                          description: tenantInfo.description || '',
                        });
                      }}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-900 rounded-lg font-medium transition-colors"
                    >
                      Avbryt
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-red-200 bg-red-50 rounded-lg shadow overflow-hidden">
              <div className="bg-red-100 p-4">
                <h3 className="font-bold text-red-900">Farlig Zon</h3>
              </div>
              <div className="p-6">
                <p className="text-red-900 mb-4">
                  Dessa åtgärder kan inte ångras. Var försiktig.
                </p>
                <button
                  disabled
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
                  title="Funktionen är inte tillgänglig ännu"
                >
                  Ta Bort Organisation
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-600">Ingen organisationsinformation tillgänglig</p>
          </div>
        )}
      </div>
    </div>
  );
}
