/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase/server';

// Types
export interface Friend {
  user_id_1: string;
  user_id_2: string;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
}

export interface SocialLeaderboardEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  game_id: string;
  score: number;
  rank: number | null;
  total_plays: number;
  best_score: number | null;
  avg_score: number | null;
  achievements_unlocked: number;
  last_played_at: string | null;
  updated_at: string;
}

export interface MultiplayerSession {
  id: string;
  game_id: string;
  created_by_user_id: string;
  max_players: number;
  current_players: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  winner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Friend Management
export async function sendFriendRequest(
  requesterId: string,
  recipientId: string
): Promise<FriendRequest | null> {
  try {
    const { data, error } = await (supabaseAdmin.from('friend_requests' as any) as any)
      .insert({
        requester_id: requesterId,
        recipient_id: recipientId,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending friend request:', error);
      return null;
    }

    return data as FriendRequest;
  } catch (err) {
    console.error('Error sending friend request:', err);
    return null;
  }
}

export async function acceptFriendRequest(requestId: string): Promise<FriendRequest | null> {
  try {
    const { data: request, error: getError } = await (supabaseAdmin.from('friend_requests' as any) as any)
      .select('*')
      .eq('id', requestId)
      .single();

    if (getError || !request) {
      console.error('Error getting friend request:', getError);
      return null;
    }

    const { error: insertError } = await (supabaseAdmin.from('friends' as any) as any)
      .insert({
        user_id_1: [request.requester_id, request.recipient_id].sort()[0],
        user_id_2: [request.requester_id, request.recipient_id].sort()[1],
      });

    if (insertError) {
      console.error('Error creating friendship:', insertError);
      return null;
    }

    const { data, error } = await (supabaseAdmin.from('friend_requests' as any) as any)
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting friend request:', error);
      return null;
    }

    return data as FriendRequest;
  } catch (err) {
    console.error('Error accepting friend request:', err);
    return null;
  }
}

export async function rejectFriendRequest(requestId: string): Promise<boolean> {
  try {
    const { error } = await (supabaseAdmin.from('friend_requests' as any) as any)
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting friend request:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error rejecting friend request:', err);
    return false;
  }
}

export async function removeFriend(userId1: string, userId2: string): Promise<boolean> {
  try {
    const sortedIds = [userId1, userId2].sort();

    const { error } = await (supabaseAdmin.from('friends' as any) as any)
      .delete()
      .eq('user_id_1', sortedIds[0])
      .eq('user_id_2', sortedIds[1]);

    if (error) {
      console.error('Error removing friend:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error removing friend:', err);
    return false;
  }
}

export async function getFriends(userId: string): Promise<Friend[] | null> {
  try {
    const { data, error } = await (supabaseAdmin.from('friends' as any) as any)
      .select('*')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return null;
    }

    return (data as Friend[]) || [];
  } catch (err) {
    console.error('Error fetching friends:', err);
    return null;
  }
}

export async function getFriendRequests(
  userId: string,
  filter: 'received' | 'sent' | 'all' = 'all'
): Promise<FriendRequest[] | null> {
  try {
    let query = (supabaseAdmin.from('friend_requests' as any) as any).select('*');

    if (filter === 'received') {
      query = query.eq('recipient_id', userId).eq('status', 'pending');
    } else if (filter === 'sent') {
      query = query.eq('requester_id', userId);
    } else {
      query = query.or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching friend requests:', error);
      return null;
    }

    return (data as FriendRequest[]) || [];
  } catch (err) {
    console.error('Error fetching friend requests:', err);
    return null;
  }
}

// Leaderboard Functions
export async function getSocialLeaderboard(
  tenantId: string,
  gameId: string,
  limit = 50,
  offset = 0
): Promise<SocialLeaderboardEntry[] | null> {
  try {
    const { data, error } = await (supabaseAdmin.from('social_leaderboards' as any) as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('game_id', gameId)
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return null;
    }

    return (data as SocialLeaderboardEntry[]) || [];
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return null;
  }
}

export async function getFriendsLeaderboard(
  userId: string,
  gameId: string,
  limit = 50
): Promise<SocialLeaderboardEntry[] | null> {
  try {
    const friends = await getFriends(userId);
    if (!friends) {
      return null;
    }

    const friendIds = friends
      .map((f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1))
      .concat(userId);

    if (friendIds.length === 0) {
      return [];
    }

    const { data, error } = await (supabaseAdmin.from('social_leaderboards' as any) as any)
      .select('*')
      .eq('game_id', gameId)
      .in('user_id', friendIds)
      .order('score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching friends leaderboard:', error);
      return null;
    }

    return (data as SocialLeaderboardEntry[]) || [];
  } catch (err) {
    console.error('Error fetching friends leaderboard:', err);
    return null;
  }
}

export async function updateLeaderboardEntry(
  tenantId: string,
  userId: string,
  gameId: string,
  params: {
    score?: number;
    totalPlays?: number;
    bestScore?: number;
    avgScore?: number;
    achievementsUnlocked?: number;
    lastPlayedAt?: Date;
  }
): Promise<SocialLeaderboardEntry | null> {
  try {
    const { data, error } = await (supabaseAdmin.from('social_leaderboards' as any) as any)
      .upsert(
        {
          game_id: gameId,
          score: params.score || 0,
          total_plays: params.totalPlays,
          best_score: params.bestScore,
          avg_score: params.avgScore,
          achievements_unlocked: params.achievementsUnlocked,
          last_played_at: params.lastPlayedAt?.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,user_id,game_id' }
      )
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating leaderboard entry:', error);
      return null;
    }

    return data as SocialLeaderboardEntry;
  } catch (err) {
    console.error('Error updating leaderboard entry:', err);
    return null;
  }
}

// Multiplayer Sessions
export async function createMultiplayerSession(
  gameId: string,
  userId: string,
  maxPlayers = 2
): Promise<MultiplayerSession | null> {
  try {
    const { data, error } = await (supabaseAdmin.from('multiplayer_sessions' as any) as any)
      .insert({
        game_id: gameId,
        created_by_user_id: userId,
        max_players: maxPlayers,
        current_players: 1,
        status: 'waiting',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating multiplayer session:', error);
      return null;
    }

    // Add creator as participant
    await (supabaseAdmin.from('multiplayer_participants' as any) as any).insert({
      session_id: (data as any).id,
      user_id: userId,
    });

    return data as MultiplayerSession;
  } catch (err) {
    console.error('Error creating multiplayer session:', err);
    return null;
  }
}

export async function joinMultiplayerSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if session is full
    const { data: session, error: sessionError } = await (supabaseAdmin
      .from('multiplayer_sessions' as any) as any)
      .select('current_players, max_players, status')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session || (session as any).status !== 'waiting') {
      console.error('Session not available');
      return false;
    }

    if ((session as any).current_players >= (session as any).max_players) {
      console.error('Session is full');
      return false;
    }

    // Add participant
    const { error: participantError } = await (supabaseAdmin
      .from('multiplayer_participants' as any) as any)
      .insert({
        session_id: sessionId,
        user_id: userId,
      });

    if (participantError) {
      console.error('Error joining session:', participantError);
      return false;
    }

    // Update session player count
    await (supabaseAdmin.from('multiplayer_sessions' as any) as any)
      .update({
        current_players: (session as any).current_players + 1,
        status:
          (session as any).current_players + 1 === (session as any).max_players
            ? 'in_progress'
            : 'waiting',
      })
      .eq('id', sessionId);

    return true;
  } catch (err) {
    console.error('Error joining multiplayer session:', err);
    return false;
  }
}

export async function endMultiplayerSession(
  sessionId: string,
  winnerUserId?: string
): Promise<boolean> {
  try {
    const { error } = await (supabaseAdmin.from('multiplayer_sessions' as any) as any)
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_user_id: winnerUserId,
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending multiplayer session:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error ending multiplayer session:', err);
    return false;
  }
}

export async function getMultiplayerSession(sessionId: string): Promise<MultiplayerSession | null> {
  try {
    const { data, error } = await (supabaseAdmin.from('multiplayer_sessions' as any) as any)
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching multiplayer session:', error);
      return null;
    }

    return data as MultiplayerSession;
  } catch (err) {
    console.error('Error fetching multiplayer session:', err);
    return null;
  }
}
