'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { useAuth } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, EmptyState, LoadingState, useToast } from '@/components/ui';
import {
  PuzzlePieceIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { Database } from '@/types/supabase';

type GameRow = Database['public']['Tables']['games']['Row'];

interface ContentItem {
  id: string;
  title: string;
  type: 'game';
  is_published: boolean;
  created_at: string;
}

interface SeasonalEvent {
  id: string;
  name: string;
  theme: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function ContentPlannerAdminPage() {
  const { currentTenant } = useTenant();
  const { user, userRole } = useAuth();
  const { success, warning } = useToast();

  const [activeTab, setActiveTab] = useState<'content' | 'events' | 'schedule'>('content');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
  }>({
    title: '',
    description: '',
  });

  const [eventData, setEventData] = useState({
    name: '',
    theme: '',
    startDate: '',
    endDate: '',
  });

  const isGlobalAdmin = userRole === 'admin' || userRole === 'superadmin';

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = supabase
        .from('games')
        .select('id, name, description, owner_tenant_id, status, created_at')
        .order('created_at', { ascending: false });

      const { data, error: queryError } = currentTenant && !isGlobalAdmin
        ? await query.eq('owner_tenant_id', currentTenant.id)
        : await query;

      if (queryError) throw queryError;

      const mapped: ContentItem[] = ((data as GameRow[]) || []).map((row) => ({
        id: row.id,
        title: row.name,
        type: 'game',
        is_published: row.status === 'published',
        created_at: row.created_at ?? new Date().toISOString(),
      }));

      setContent(mapped);
    } catch (err) {
      console.error('Failed to load content', err);
      setError('Kunde inte ladda innehåll.');
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant, isGlobalAdmin]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    void loadContent();
  }, [loadContent, user]);

  const handleCreateContent = async () => {
    if (!formData.title) return;

    try {
      const { data, error: insertError } = await supabase
        .from('games')
        .insert({
          name: formData.title,
          description: formData.description,
          owner_tenant_id: currentTenant?.id ?? null,
          status: 'draft',
        })
        .select('id, name, status, created_at')
        .single();

      if (insertError) throw insertError;

      const newItem: ContentItem = {
        id: data.id,
        title: data.name,
        type: 'game',
        is_published: data.status === 'published',
        created_at: data.created_at ?? new Date().toISOString(),
      };

      setContent((prev) => [newItem, ...prev]);
      setFormData({ title: '', description: '' });
      setShowCreateModal(false);
      success('Innehåll skapat.');
    } catch (err) {
      console.error('Failed to create content', err);
      setError('Kunde inte skapa innehåll.');
    }
  };

  const handleCreateEvent = () => {
    if (!eventData.name || !eventData.startDate || !eventData.endDate) return;

    const newEvent: SeasonalEvent = {
      id: `event-${Date.now()}`,
      name: eventData.name,
      theme: eventData.theme || null,
      start_date: eventData.startDate,
      end_date: eventData.endDate,
      is_active: true,
    };

    setEvents([newEvent, ...events]);
    setEventData({ name: '', theme: '', startDate: '', endDate: '' });
    setShowEventModal(false);
  };

  const toggleContentPublish = async (id: string, current: boolean) => {
    try {
      const nextStatus = current ? 'draft' : 'published';
      const { error: updateError } = await supabase
        .from('games')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;

      setContent((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_published: !current } : item))
      );
      success(nextStatus === 'published' ? 'Publicerat' : 'Återställt till utkast');
    } catch (err) {
      console.error('Failed to update publish status', err);
      setError('Kunde inte uppdatera publiceringsstatus.');
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('games').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setContent((prev) => prev.filter((item) => item.id !== id));
      warning('Innehållet togs bort.');
    } catch (err) {
      console.error('Failed to delete content', err);
      setError('Kunde inte ta bort innehåll.');
    }
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter((event) => event.id !== id));
  };

  const isLoadingContent = isLoading && content.length === 0;

  if (!user) {
    return (
      <EmptyState
        title="Ingen åtkomst"
        description="Du behöver vara inloggad för att hantera innehåll."
        action={{ label: 'Go to login', onClick: () => (window.location.href = '/auth/login') }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <PuzzlePieceIcon className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Content Planner</h1>
          </div>
          <p className="text-muted-foreground">Hantera innehåll, säsongevent och spelschema</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-card rounded-lg p-2 shadow border border-border">
          {(['content', 'events', 'schedule'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab === 'content' && 'Content Items'}
              {tab === 'events' && 'Seasonal Events'}
              {tab === 'schedule' && 'Publishing Schedule'}
            </button>
          ))}
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div>
            <Button onClick={() => setShowCreateModal(true)} className="mb-6">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Content
            </Button>

            {error && (
              <Card className="mb-3 border-amber-500/40 bg-amber-500/5">
                <CardContent className="flex items-center justify-between gap-3 p-3 text-sm text-amber-700">
                  <span>{error}</span>
                  <Button size="sm" variant="outline" onClick={() => void loadContent()}>
                    Försök igen
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {isLoadingContent ? (
                <LoadingState message="Laddar innehåll..." />
              ) : content.length === 0 ? (
                <EmptyState
                  icon={<PuzzlePieceIcon className="h-8 w-8" />}
                  title="No content created yet"
                  description="Skapa ditt första spel eller innehåll för din organisation."
                  action={{ label: "Create content", onClick: () => setShowCreateModal(true) }}
                />
              ) : (
                content.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-2 items-center mb-2">
                            <h3 className="font-bold text-foreground">{item.title}</h3>
                            <Badge variant="secondary">{item.type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={item.is_published ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleContentPublish(item.id, item.is_published)}
                            className={item.is_published ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            {item.is_published ? 'Published' : 'Publish'}
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteContent(item.id)}>
                            <TrashIcon className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            <Button
              onClick={() => setShowEventModal(true)}
              className="mb-6"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Event
            </Button>

            <div className="space-y-3">
              {events.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No seasonal events created yet</p>
                    <Button onClick={() => setShowEventModal(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create First Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex gap-2 items-center mb-2">
                            <h3 className="font-bold text-foreground">{event.name}</h3>
                            {event.theme && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                {event.theme}
                              </Badge>
                            )}
                            <Badge variant={event.is_active ? 'default' : 'secondary'}>
                              {event.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteEvent(event.id)}
                        >
                          <TrashIcon className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle>Publishing Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Manage when content becomes visible to players. Future feature coming soon.
              </p>
              <div className="bg-muted rounded border-2 border-dashed border-border p-8 text-center">
                <p className="text-muted-foreground">Content scheduling interface will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle>Create Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Content title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="Content description"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateContent}
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full">
            <CardHeader>
              <CardTitle>Create Seasonal Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Event Name</label>
                  <input
                    type="text"
                    value={eventData.name}
                    onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="e.g. Halloween 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Theme</label>
                  <input
                    type="text"
                    value={eventData.theme}
                    onChange={(e) => setEventData({ ...eventData, theme: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    placeholder="e.g. halloween, christmas"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                    <input
                      type="date"
                      value={eventData.startDate}
                      onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
                    <input
                      type="date"
                      value={eventData.endDate}
                      onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEventModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateEvent}
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
