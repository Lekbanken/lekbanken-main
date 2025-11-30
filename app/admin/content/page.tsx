'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/context/TenantContext';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  PuzzlePieceIcon,
  PlusIcon,
  TrashIcon,
  StarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface ContentItem {
  id: string;
  title: string;
  type: 'game' | 'collection' | 'event' | 'challenge';
  is_published: boolean;
  is_featured: boolean;
  view_count: number;
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

  const [activeTab, setActiveTab] = useState<'content' | 'events' | 'schedule'>('content');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    type: 'game' | 'collection' | 'event' | 'challenge';
  }>({
    title: '',
    description: '',
    type: 'game',
  });

  const [eventData, setEventData] = useState({
    name: '',
    theme: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    // Placeholder - would load from service once DB migrates
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, [currentTenant?.id]);

  const handleCreateContent = () => {
    if (!formData.title) return;

    const newItem: ContentItem = {
      id: `content-${Date.now()}`,
      title: formData.title,
      type: formData.type,
      is_published: false,
      is_featured: false,
      view_count: 0,
      created_at: new Date().toISOString(),
    };

    setContent([newItem, ...content]);
    setFormData({ title: '', description: '', type: 'game' });
    setShowCreateModal(false);
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

  const toggleContentPublish = (id: string) => {
    setContent(
      content.map((item) =>
        item.id === id ? { ...item, is_published: !item.is_published } : item
      )
    );
  };

  const toggleContentFeatured = (id: string) => {
    setContent(
      content.map((item) =>
        item.id === id ? { ...item, is_featured: !item.is_featured } : item
      )
    );
  };

  const deleteContent = (id: string) => {
    setContent(content.filter((item) => item.id !== id));
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter((event) => event.id !== id));
  };

  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-5xl mx-auto pt-20">
          <h1 className="text-3xl font-bold text-foreground">Content Planner</h1>
          <p className="text-muted-foreground">Tenant context required</p>
        </div>
      </div>
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
            <Button
              onClick={() => setShowCreateModal(true)}
              className="mb-6"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Content
            </Button>

            <div className="space-y-3">
              {isLoading ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">Loading...</p>
                  </CardContent>
                </Card>
              ) : content.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground mb-4">No content created yet</p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create First Content
                    </Button>
                  </CardContent>
                </Card>
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
                            Views: {item.view_count} • Created: {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={item.is_featured ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleContentFeatured(item.id)}
                            className={item.is_featured ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                          >
                            <StarIcon className="h-3 w-3 mr-1" />
                            {item.is_featured ? 'Featured' : 'Feature'}
                          </Button>
                          <Button
                            variant={item.is_published ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleContentPublish(item.id)}
                            className={item.is_published ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            {item.is_published ? 'Published' : 'Publish'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteContent(item.id)}
                          >
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
                  <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'game' | 'collection' | 'event' | 'challenge' })}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  >
                    <option value="game">Game</option>
                    <option value="collection">Collection</option>
                    <option value="event">Event</option>
                    <option value="challenge">Challenge</option>
                  </select>
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
