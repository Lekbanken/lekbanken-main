'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/lib/context/TenantContext';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-5xl mx-auto pt-20">
          <h1 className="text-3xl font-bold text-slate-900">Content Planner</h1>
          <p className="text-slate-600">Tenant context required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Content Planner</h1>
          <p className="text-slate-600">Hantera innehål, säsongevent och spellschema</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          {(['content', 'events', 'schedule'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + Add Content
            </button>

            <div className="space-y-3">
              {isLoading ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-slate-600">Loading...</p>
                </div>
              ) : content.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-slate-600 mb-4">No content created yet</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                  >
                    Create First Content
                  </button>
                </div>
              ) : (
                content.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex gap-2 items-center mb-2">
                          <h3 className="font-bold text-slate-900">{item.title}</h3>
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded font-medium">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          Views: {item.view_count} • Created: {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleContentFeatured(item.id)}
                          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                            item.is_featured
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.is_featured ? '⭐ Featured' : 'Feature'}
                        </button>
                        <button
                          onClick={() => toggleContentPublish(item.id)}
                          className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                            item.is_published
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {item.is_published ? '✓ Published' : 'Publish'}
                        </button>
                        <button
                          onClick={() => deleteContent(item.id)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div>
            <button
              onClick={() => setShowEventModal(true)}
              className="mb-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              + Create Event
            </button>

            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-slate-600 mb-4">No seasonal events created yet</p>
                  <button
                    onClick={() => setShowEventModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                  >
                    Create First Event
                  </button>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex gap-2 items-center mb-2">
                          <h3 className="font-bold text-slate-900">{event.name}</h3>
                          {event.theme && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-medium">
                              {event.theme}
                            </span>
                          )}
                          <span
                            className={`px-2 py-1 text-xs rounded font-medium ${
                              event.is_active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {event.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Publishing Schedule</h3>
            <p className="text-slate-600 mb-6">
              Manage when content becomes visible to players. Future feature coming soon.
            </p>
            <div className="bg-slate-50 rounded border-2 border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-600">Content scheduling interface will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Create Content</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Content title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'game' | 'collection' | 'event' | 'challenge' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="game">Game</option>
                  <option value="collection">Collection</option>
                  <option value="event">Event</option>
                  <option value="challenge">Challenge</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Content description"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContent}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Create Seasonal Event</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                <input
                  type="text"
                  value={eventData.name}
                  onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. Halloween 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Theme</label>
                <input
                  type="text"
                  value={eventData.theme}
                  onChange={(e) => setEventData({ ...eventData, theme: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. halloween, christmas"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={eventData.startDate}
                    onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={eventData.endDate}
                    onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
