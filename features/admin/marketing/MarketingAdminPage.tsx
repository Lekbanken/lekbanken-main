'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import {
  SparklesIcon,
  NewspaperIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import {
  AdminPageHeader,
  AdminPageLayout,
  AdminBreadcrumbs,
} from '@/components/admin/shared';
import { Button, Card, CardContent, Tabs, InlineAlert } from '@/components/ui';
import { FeatureList, FeatureEditor, UpdateList, UpdateEditor } from './components';
import type { MarketingFeature, MarketingUpdate } from '@/lib/marketing/types';
import type { AdminTab, FeatureFormData, UpdateFormData } from './types';
import {
  createFeatureAction,
  updateFeatureAction,
  deleteFeatureAction,
  createUpdateAction,
  updateUpdateAction,
  deleteUpdateAction,
  publishUpdateAction,
  fetchAllFeaturesAction,
  fetchAllUpdatesAction,
} from './actions';

interface MarketingAdminPageProps {
  defaultTab?: AdminTab;
}

export function MarketingAdminPage({ defaultTab = 'features' }: MarketingAdminPageProps) {
  const t = useTranslations('admin.nav');
  const router = useRouter();
  const pathname = usePathname();
  
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  const [features, setFeatures] = useState<MarketingFeature[]>([]);
  const [updates, setUpdates] = useState<MarketingUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Editor states
  const [editingFeature, setEditingFeature] = useState<MarketingFeature | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<MarketingUpdate | null>(null);
  const [isCreatingFeature, setIsCreatingFeature] = useState(false);
  const [isCreatingUpdate, setIsCreatingUpdate] = useState(false);
  
  const [isPending, startTransition] = useTransition();

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [featuresRes, updatesRes] = await Promise.all([
          fetchAllFeaturesAction(),
          fetchAllUpdatesAction(),
        ]);
        if (featuresRes.success && featuresRes.data) {
          setFeatures(featuresRes.data.features);
        }
        if (updatesRes.success && updatesRes.data) {
          setUpdates(updatesRes.data.updates);
        }
        if (!featuresRes.success || !updatesRes.success) {
          setError('Kunde inte ladda all data. Försök igen.');
        }
      } catch (err) {
        console.error('Failed to load marketing data:', err);
        setError('Kunde inte ladda data. Försök igen.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync tab with URL
  useEffect(() => {
    if (pathname.includes('/updates')) {
      setActiveTab('updates');
    } else {
      setActiveTab('features');
    }
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as AdminTab);
    router.push(`/admin/marketing/${tab}`);
  };

  // Feature handlers
  const handleCreateFeature = () => {
    setEditingFeature(null);
    setIsCreatingFeature(true);
  };

  const handleEditFeature = (feature: MarketingFeature) => {
    setEditingFeature(feature);
    setIsCreatingFeature(false);
  };

  const handleSaveFeature = async (data: FeatureFormData) => {
    startTransition(async () => {
      try {
        if (editingFeature) {
          const result = await updateFeatureAction(editingFeature.id, {
            title: data.title,
            subtitle: data.subtitle || undefined,
            description: data.description || undefined,
            iconName: data.iconName || undefined,
            imageUrl: data.imageUrl || undefined,
            audience: data.audience,
            useCase: data.useCase,
            context: data.context,
            tags: data.tags,
            relatedGamesCount: data.relatedGamesCount,
            priority: data.priority,
            isFeatured: data.isFeatured,
            status: data.status,
          });
          if (result.success && result.data) {
            setFeatures(prev => prev.map(f => f.id === editingFeature.id ? result.data! : f));
          }
        } else {
          const result = await createFeatureAction({
            title: data.title,
            subtitle: data.subtitle || undefined,
            description: data.description || undefined,
            iconName: data.iconName || undefined,
            imageUrl: data.imageUrl || undefined,
            audience: data.audience,
            useCase: data.useCase,
            context: data.context,
            tags: data.tags,
            relatedGamesCount: data.relatedGamesCount,
            priority: data.priority,
            isFeatured: data.isFeatured,
            status: data.status,
          });
          if (result.success && result.data) {
            setFeatures(prev => [result.data!, ...prev]);
          }
        }
        setEditingFeature(null);
        setIsCreatingFeature(false);
      } catch (err) {
        console.error('Failed to save feature:', err);
      }
    });
  };

  const handleDeleteFeature = async (id: string) => {
    startTransition(async () => {
      const result = await deleteFeatureAction(id);
      if (result.success) {
        setFeatures(prev => prev.filter(f => f.id !== id));
      }
    });
  };

  // Update handlers
  const handleCreateUpdate = () => {
    setEditingUpdate(null);
    setIsCreatingUpdate(true);
  };

  const handleEditUpdate = (update: MarketingUpdate) => {
    setEditingUpdate(update);
    setIsCreatingUpdate(false);
  };

  const handleSaveUpdate = async (data: UpdateFormData) => {
    startTransition(async () => {
      try {
        if (editingUpdate) {
          const result = await updateUpdateAction(editingUpdate.id, {
            type: data.type,
            title: data.title,
            body: data.body || undefined,
            imageUrl: data.imageUrl || undefined,
            tags: data.tags,
            publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
            status: data.status,
          });
          if (result.success && result.data) {
            setUpdates(prev => prev.map(u => u.id === editingUpdate.id ? result.data! : u));
          }
        } else {
          const result = await createUpdateAction({
            type: data.type,
            title: data.title,
            body: data.body || undefined,
            imageUrl: data.imageUrl || undefined,
            tags: data.tags,
            publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
            status: data.status,
          });
          if (result.success && result.data) {
            setUpdates(prev => [result.data!, ...prev]);
          }
        }
        setEditingUpdate(null);
        setIsCreatingUpdate(false);
      } catch (err) {
        console.error('Failed to save update:', err);
      }
    });
  };

  const handleDeleteUpdate = async (id: string) => {
    startTransition(async () => {
      const result = await deleteUpdateAction(id);
      if (result.success) {
        setUpdates(prev => prev.filter(u => u.id !== id));
      }
    });
  };

  const handlePublishUpdate = async (id: string) => {
    startTransition(async () => {
      const result = await publishUpdateAction(id);
      if (result.success && result.data) {
        setUpdates(prev => prev.map(u => u.id === id ? result.data! : u));
      }
    });
  };

  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'Marketing', href: '/admin/marketing' },
    { label: activeTab === 'features' ? t('marketingFeatures') : t('marketingUpdates') },
  ];

  const publishedFeatures = features.filter(f => f.status === 'published').length;
  const draftFeatures = features.filter(f => f.status === 'draft').length;
  const publishedUpdates = updates.filter(u => u.status === 'published').length;
  const draftUpdates = updates.filter(u => u.status === 'draft').length;

  const tabItems = useMemo(() => [
    {
      id: 'features',
      label: t('marketingFeatures'),
      icon: <SparklesIcon className="h-4 w-4" />,
      badge: features.length,
    },
    {
      id: 'updates',
      label: t('marketingUpdates'),
      icon: <NewspaperIcon className="h-4 w-4" />,
      badge: updates.length,
    },
  ], [t, features.length, updates.length]);

  return (
    <AdminPageLayout>
      <AdminBreadcrumbs items={breadcrumbs} />
      
      <AdminPageHeader
        icon={<SparklesIcon className="h-8 w-8" />}
        title="Marketing"
        description={t('marketingFeatures')}
      />

      <div className="mt-6 space-y-6">
        {/* Tabs */}
        <div className="flex items-center justify-between gap-4">
          <Tabs 
            tabs={tabItems} 
            activeTab={activeTab} 
            onChange={(tabId) => handleTabChange(tabId)}
          />

          {activeTab === 'features' && (
            <Button onClick={handleCreateFeature} disabled={isPending}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('marketingFeatures')}
            </Button>
          )}
          {activeTab === 'updates' && (
            <Button onClick={handleCreateUpdate} disabled={isPending}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('marketingUpdates')}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{publishedFeatures}</div>
              <div className="text-sm text-muted-foreground">{t('marketingFeatures')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{draftFeatures}</div>
              <div className="text-sm text-muted-foreground">{t('marketingFeatures')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{publishedUpdates}</div>
              <div className="text-sm text-muted-foreground">{t('marketingUpdates')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{draftUpdates}</div>
              <div className="text-sm text-muted-foreground">{t('marketingUpdates')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Error state */}
        {error && (
          <InlineAlert variant="error">
            {error}
          </InlineAlert>
        )}

        {/* Loading state */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">{t('dashboard')}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Features tab content */}
            {activeTab === 'features' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <FeatureList
                  features={features}
                  onEdit={handleEditFeature}
                  onDelete={handleDeleteFeature}
                  selectedId={editingFeature?.id}
                  isPending={isPending}
                />
                {(isCreatingFeature || editingFeature) && (
                  <FeatureEditor
                    key={editingFeature?.id ?? 'new'}
                    feature={editingFeature}
                    onSave={handleSaveFeature}
                    onCancel={() => {
                      setEditingFeature(null);
                      setIsCreatingFeature(false);
                    }}
                    isPending={isPending}
                  />
                )}
              </div>
            )}

            {/* Updates tab content */}
            {activeTab === 'updates' && (
              <div className="grid lg:grid-cols-2 gap-6">
                <UpdateList
                  updates={updates}
                  onEdit={handleEditUpdate}
                  onDelete={handleDeleteUpdate}
                  onPublish={handlePublishUpdate}
                  selectedId={editingUpdate?.id}
                  isPending={isPending}
                />
                {(isCreatingUpdate || editingUpdate) && (
                  <UpdateEditor
                    key={editingUpdate?.id ?? 'new'}
                    update={editingUpdate}
                    onSave={handleSaveUpdate}
                    onCancel={() => {
                      setEditingUpdate(null);
                      setIsCreatingUpdate(false);
                    }}
                    isPending={isPending}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AdminPageLayout>
  );
}
