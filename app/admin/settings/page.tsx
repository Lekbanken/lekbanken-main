'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { SystemAdminClientGuard } from '@/components/admin/SystemAdminClientGuard';
import { supabase } from '@/lib/supabase/client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

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
  const t = useTranslations('admin.settings');
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const userId = user?.id;
  const tenantId = currentTenant?.id;

  // States
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Load tenant info
  useEffect(() => {
    if (!userId || !tenantId) return;

    const loadTenantInfo = async () => {
      setIsLoading(true);
      try {
        // Get tenant basic info
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .single();

        if (tenantError) {
          console.error('Error loading tenant:', tenantError);
          return;
        }

        // Get member count
        const { count: memberCount } = await supabase
          .from('user_tenant_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

        // Get game count
        const { count: gameCount } = await supabase
          .from('games')
          .select('*', { count: 'exact', head: true })
          .eq('owner_tenant_id', tenantId);

        // Get session count
        const { count: sessionCount } = await supabase
          .from('game_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

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
  }, [userId, tenantId]);

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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">{t('title')}</h1>
            <p className="text-muted-foreground">{t('requiresAdmin')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SystemAdminClientGuard>
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Cog6ToothIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">{t('title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('loading')}</p>
          </div>
        ) : tenantInfo ? (
          <div className="space-y-6">
            {/* Organization Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm font-medium mb-1">{t('members')}</p>
                  <p className="text-3xl font-bold text-foreground">{tenantInfo.member_count}</p>
                  <p className="text-xs text-muted-foreground mt-2">{t('inOrganization')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm font-medium mb-1">{t('games')}</p>
                  <p className="text-3xl font-bold text-foreground">{tenantInfo.game_count}</p>
                  <p className="text-xs text-muted-foreground mt-2">{t('available')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm font-medium mb-1">{t('gameSessions')}</p>
                  <p className="text-3xl font-bold text-foreground">{tenantInfo.session_count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-2">{t('total')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm font-medium mb-1">{t('subscriptionStatus')}</p>
                  <p className="text-lg font-bold text-foreground capitalize mb-2">{tenantInfo.subscription_tier}</p>
                  <Badge variant={tenantInfo.subscription_status === 'active' ? 'default' : 'secondary'}>
                    {tenantInfo.subscription_status === 'active' ? t('active') : t('authorized')}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Organization Info */}
            <Card>
              <CardHeader className="bg-primary p-4 flex flex-row justify-between items-center">
                <CardTitle className="text-white">{t('organizationInfo')}</CardTitle>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="bg-white text-primary hover:bg-muted"
                  >
                    {t('edit')}
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('organizationName')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    />
                  ) : (
                    <p className="text-foreground">{tenantInfo.name}</p>
                  )}
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('slug')}
                  </label>
                  <p className="text-muted-foreground text-sm">{tenantInfo.slug}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('slugReadonly')}</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {t('description')}
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editValues.description}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground resize-none"
                    />
                  ) : (
                    <p className="text-muted-foreground">{tenantInfo.description || '-'}</p>
                  )}
                </div>

                {/* Created */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Skapad
                  </label>
                  <p className="text-muted-foreground text-sm">
                    {new Date(tenantInfo.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>

                {/* Tenant ID */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Organisation ID
                  </label>
                  <p className="text-muted-foreground text-sm break-all font-mono text-xs">{tenantInfo.id}</p>
                </div>

                {/* Save/Cancel Buttons */}
                {isEditing && (
                  <div className="flex gap-3 pt-4 border-t border-border mt-6">
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving ? 'Sparar...' : 'Spara Ändringar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setEditValues({
                          name: tenantInfo.name,
                          description: tenantInfo.description || '',
                        });
                      }}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Avbryt
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="bg-red-100 p-4">
                <CardTitle className="text-red-900">{t('dangerZone')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-red-900 mb-4">
                  {t('dangerWarning')}
                </p>
                <Button
                  variant="destructive"
                  disabled
                  title={t('featureNotAvailable')}
                >
                  {t('deleteOrganization')}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('noOrganizationInfo')}</p>
          </div>
        )}
      </div>
    </div>
    </SystemAdminClientGuard>
  );
}
