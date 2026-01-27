'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import type {
  FriendRequest 
} from '@/lib/services/socialService';
import { 
  getFriends, 
  getFriendRequests, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  removeFriend 
} from '@/lib/services/socialService';
import { supabase } from '@/lib/supabase/client';

interface FriendInfo {
  id: string;
  email: string;
}

export default function FriendsPage() {
  const t = useTranslations('app.profile');
  const { user, isLoading: authLoading } = useAuth();

  const userId = user?.id;

  const [friendsList, setFriendsList] = useState<FriendInfo[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [addFriendEmail, setAddFriendEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendInfo[]>([]);

  useEffect(() => {
    // Wait for auth to finish loading before deciding there's no user
    if (authLoading) return;
    
    // If no user after auth is done, stop loading
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [friends, received, sent] = await Promise.all([
          getFriends(userId),
          getFriendRequests(userId, 'received'),
          getFriendRequests(userId, 'sent'),
        ]);

        // Fetch friend details
        if (friends && friends.length > 0) {
          const friendIds = friends.map((f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));

          const { data: friendDetails } = await supabase
            .from('users')
            .select('id, email')
            .in('id', friendIds);

          setFriendsList((friendDetails as FriendInfo[] | null) || []);
        }

        setReceivedRequests(received || []);
        setSentRequests(sent || []);
      } catch (err) {
        console.error('Error loading data:', err);
      }
      setIsLoading(false);
    };

    loadData();
  }, [userId, authLoading]);

  const handleSearchUsers = async (email: string) => {
    if (!email.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', `%${email}%`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      // Filter out self and existing friends
      const filtered = (data as FriendInfo[] | null || []).filter(
        (u) => u.id !== user?.id && !friendsList.some((f) => f.id === u.id)
      );

      setSearchResults(filtered);
    } catch (err) {
      console.error('Error searching users:', err);
    }
    setIsSearching(false);
  };

  const handleSendRequest = async (recipientId: string) => {
    if (!user) return;

    const success = await sendFriendRequest(user.id, recipientId);
    if (success) {
      setAddFriendEmail('');
      setSearchResults([]);
      const updated = await getFriendRequests(user.id, 'sent');
      setSentRequests(updated || []);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const success = await acceptFriendRequest(requestId);
    if (success) {
      setReceivedRequests(receivedRequests.filter((r) => r.id !== requestId));
      const updated = await getFriends(user?.id || '');
      if (updated) {
        const friendIds = updated.map((f) => (f.user_id_1 === user?.id ? f.user_id_2 : f.user_id_1));
        const { data: friendDetails } = await supabase
          .from('users')
          .select('id, email')
          .in('id', friendIds);
        setFriendsList((friendDetails as FriendInfo[] | null) || []);
      }
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const success = await rejectFriendRequest(requestId);
    if (success) {
      setReceivedRequests(receivedRequests.filter((r) => r.id !== requestId));
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user) return;

    const success = await removeFriend(user.id, friendId);
    if (success) {
      setFriendsList(friendsList.filter((f) => f.id !== friendId));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-3xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">{t('sections.friends.title')}</h1>
            <p className="text-muted-foreground">{t('sections.friends.loginRequired')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{t('title')}</p>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{t('sections.friends.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('sections.friends.description')}</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['friends', 'requests', 'add'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {tab === 'friends' && `${t('sections.friends.tabs.friends')} (${friendsList.length})`}
            {tab === 'requests' && `${t('sections.friends.tabs.requests')} (${receivedRequests.length})`}
            {tab === 'add' && t('sections.friends.tabs.add')}
          </button>
        ))}
      </div>

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-muted-foreground">{t('sections.friends.loading')}</p>
            </div>
          ) : friendsList.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground mb-4">{t('sections.friends.noFriends')}</p>
              <button
                onClick={() => setActiveTab('add')}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
              >
                {t('sections.friends.addFirstFriend')}
              </button>
            </div>
          ) : (
            friendsList.map((friend) => (
              <div key={friend.id} className="rounded-2xl border border-border bg-card p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-foreground">{friend.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveFriend(friend.id)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-sm rounded-lg font-medium transition-colors"
                >
                  {t('sections.friends.remove')}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-muted-foreground">{t('sections.friends.loading')}</p>
            </div>
          ) : receivedRequests.length === 0 && sentRequests.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">{t('sections.friends.noPendingRequests')}</p>
            </div>
          ) : (
            <>
              {receivedRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{t('sections.friends.receivedRequests')}</h3>
                  {receivedRequests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-border bg-card p-4 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('sections.friends.requestFrom')}</p>
                        <p className="font-semibold text-foreground">{req.requester_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 text-sm rounded-lg font-medium transition-colors"
                        >
                          {t('sections.friends.accept')}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 text-sm rounded-lg font-medium transition-colors"
                        >
                          {t('sections.friends.reject')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {sentRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">{t('sections.friends.sentRequests')}</h3>
                  {sentRequests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-border bg-muted/40 p-4 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('sections.friends.pendingTo')}</p>
                        <p className="font-semibold text-foreground">{req.recipient_id}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 text-xs rounded-full font-medium">
                        {t('sections.friends.pending')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Friend Tab */}
      {activeTab === 'add' && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">{t('sections.friends.searchUsers')}</h3>
          <div className="space-y-4">
            <input
              type="email"
              placeholder={t('sections.friends.searchPlaceholder')}
              value={addFriendEmail}
              onChange={(e) => {
                setAddFriendEmail(e.target.value);
                handleSearchUsers(e.target.value);
              }}
              className="w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
            />

            {isSearching && <p className="text-muted-foreground text-sm">{t('sections.friends.searching')}</p>}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('sections.friends.results')}</p>
                {searchResults.map((user) => (
                  <div key={user.id} className="flex justify-between items-center p-4 border border-border rounded-xl">
                    <div>
                      <p className="font-medium text-foreground">{user.email}</p>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg font-medium transition-colors">
                      {t('sections.friends.addFriend')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addFriendEmail.trim() && searchResults.length === 0 && !isSearching && (
              <p className="text-muted-foreground text-sm">{t('sections.friends.noUserFound')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
