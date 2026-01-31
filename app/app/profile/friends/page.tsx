'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/supabase/auth';
import { useProfileQuery } from '@/hooks/useProfileQuery';
import { useBrowserSupabase } from '@/hooks/useBrowserSupabase';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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

interface FriendInfo {
  id: string;
  email: string;
}

interface FriendsData {
  friends: FriendInfo[];
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  partialFailure?: boolean;
}

export default function FriendsPage() {
  const t = useTranslations('app.profile');
  const { user, isLoading: authLoading } = useAuth();
  const { supabase } = useBrowserSupabase();

  const userId = user?.id;

  // Stabil queryKey
  const queryKey = `friends-${userId ?? 'anon'}`;

  // Använd useProfileQuery med Promise.allSettled
  const {
    data: friendsData,
    isLoading,
    status,
    error: queryError,
    retry,
  } = useProfileQuery<FriendsData>(
    queryKey,
    async () => {
      if (!userId || !supabase) {
        throw new Error('Missing userId or supabase');
      }

      // Promise.allSettled för partial data
      const results = await Promise.allSettled([
        getFriends(userId),
        getFriendRequests(userId, 'received'),
        getFriendRequests(userId, 'sent'),
      ]);

      const friendships = results[0].status === 'fulfilled' ? results[0].value : [];
      const receivedRequests = results[1].status === 'fulfilled' ? results[1].value : [];
      const sentRequests = results[2].status === 'fulfilled' ? results[2].value : [];

      // Hämta friend details om vi har friendships
      let friends: FriendInfo[] = [];
      if (friendships && friendships.length > 0) {
        const friendIds = friendships.map((f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));
        const { data: friendDetails } = await supabase
          .from('users')
          .select('id, email')
          .in('id', friendIds);
        friends = (friendDetails as FriendInfo[] | null) || [];
      }

      // Kasta om alla tre failade
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed && results[0].status === 'rejected') {
        throw results[0].reason;
      }

      return {
        friends,
        receivedRequests: receivedRequests || [],
        sentRequests: sentRequests || [],
        partialFailure: !allFailed && results.some(r => r.status === 'rejected'),
      };
    },
    { userId, supabaseRef: supabase ? 1 : 0 },
    {
      timeout: 12000,
      skip: authLoading || !supabase || !userId,
    }
  );

  // Local state för UI och mutations
  const [friendsList, setFriendsList] = useState<FriendInfo[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [addFriendEmail, setAddFriendEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendInfo[]>([]);

  // Synka data från query till local state
  if (friendsData && status === 'success') {
    if (friendsList !== friendsData.friends) {
      setFriendsList(friendsData.friends);
    }
    if (receivedRequests !== friendsData.receivedRequests) {
      setReceivedRequests(friendsData.receivedRequests);
    }
    if (sentRequests !== friendsData.sentRequests) {
      setSentRequests(friendsData.sentRequests);
    }
  }

  const handleSearchUsers = async (email: string) => {
    if (!email.trim() || !supabase) {
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
    if (!supabase) return;
    
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

      {/* Query error/timeout */}
      {(status === 'error' || status === 'timeout') && (
        <Alert variant="error" title={status === 'timeout' ? 'Anslutningen tog för lång tid' : 'Kunde inte ladda data'}>
          <div className="space-y-3">
            <p>{queryError || 'Ett oväntat fel uppstod.'}</p>
            <Button onClick={retry} variant="outline" size="sm">
              Försök igen
            </Button>
          </div>
        </Alert>
      )}

      {/* Partial failure warning */}
      {friendsData?.partialFailure && (
        <Alert variant="warning" title="Delvis fel">
          <p>Vissa data kunde inte laddas. Informationen nedan kan vara ofullständig.</p>
        </Alert>
      )}

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
