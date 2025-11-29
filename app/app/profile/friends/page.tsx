'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { 
  getFriends, 
  getFriendRequests, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  removeFriend,
  FriendRequest 
} from '@/lib/services/socialService';
import { supabaseAdmin } from '@/lib/supabase/server';

interface FriendInfo {
  id: string;
  email: string;
}

export default function FriendsPage() {
  const { user } = useAuth();

  const [friendsList, setFriendsList] = useState<FriendInfo[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'add'>('friends');
  const [addFriendEmail, setAddFriendEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendInfo[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [friends, received, sent] = await Promise.all([
          getFriends(user.id),
          getFriendRequests(user.id, 'received'),
          getFriendRequests(user.id, 'sent'),
        ]);

        // Fetch friend details
        if (friends && friends.length > 0) {
          const friendIds = friends.map((f) => (f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1));

          const { data: friendDetails } = await supabaseAdmin
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
  }, [user]);

  const handleSearchUsers = async (email: string) => {
    if (!email.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabaseAdmin
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
        const { data: friendDetails } = await supabaseAdmin
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-3xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Friends</h1>
            <p className="text-slate-600">Du måste vara inloggad för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Friends</h1>
          <p className="text-slate-600">Hantera dina vänner och vänförfrågningar</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg p-2 shadow">
          {(['friends', 'requests', 'add'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'friends' && `Friends (${friendsList.length})`}
              {tab === 'requests' && `Requests (${receivedRequests.length})`}
              {tab === 'add' && 'Add Friend'}
            </button>
          ))}
        </div>

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-slate-600">Laddar...</p>
              </div>
            ) : friendsList.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-slate-600 mb-4">Du har inga vänner ännu</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                >
                  Add Your First Friend
                </button>
              </div>
            ) : (
              friendsList.map((friend) => (
                <div key={friend.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900">{friend.email}</p>
                    <p className="text-xs text-slate-500">{friend.id}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <p className="text-slate-600">Laddar...</p>
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-slate-600">Du har inga väntande vänförfrågningar</p>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Received Requests</h3>
                <div className="space-y-2 mb-6">
                  {receivedRequests.map((req) => (
                    <div key={req.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-600">Friend request from:</p>
                        <p className="font-bold text-slate-900">{req.requester_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.id)}
                          className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded font-medium transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded font-medium transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sentRequests.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Sent Requests</h3>
                <div className="space-y-2">
                  {sentRequests.map((req) => (
                    <div key={req.id} className="bg-slate-50 rounded-lg p-4 flex justify-between items-center border border-slate-200">
                      <div>
                        <p className="text-sm text-slate-600">Pending friend request to:</p>
                        <p className="font-bold text-slate-900">{req.recipient_id}</p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Friend Tab */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-slate-900 mb-4">Search Users</h3>
            <div className="space-y-4">
              <input
                type="email"
                placeholder="Enter email address"
                value={addFriendEmail}
                onChange={(e) => {
                  setAddFriendEmail(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />

              {isSearching && <p className="text-slate-600 text-sm">Searching...</p>}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 font-medium">Results:</p>
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex justify-between items-center p-3 border border-slate-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{user.email}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(user.id)}
                        className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium transition-colors"
                      >
                        Add Friend
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addFriendEmail.trim() && searchResults.length === 0 && !isSearching && (
                <p className="text-slate-500 text-sm">No users found matching that email</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
