import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';
import { notifyFriendRequest, notifyFriendAccepted } from '@/utils/pushNotifications';

export interface FriendWithStatus extends Profile {
  is_top_friend?: boolean;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  requester: Profile;
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [topFriends, setTopFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]); // user_ids of people we sent requests to
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    // Get accepted friendships with top friend status
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        is_top_friend,
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (!error && friendships) {
      const friendProfiles = friendships
        .map(f => {
          const friend = f.friend as Profile | null;
          if (friend) {
            return { ...friend, is_top_friend: f.is_top_friend } as FriendWithStatus;
          }
          return null;
        })
        .filter((f): f is FriendWithStatus => f !== null);
      
      setFriends(friendProfiles);
      setTopFriends(friendProfiles.filter(f => f.is_top_friend));
    }

    // Get pending friend requests (people who want to be our friend)
    const { data: requests } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:profiles!friendships_user_id_fkey(*)
      `)
      .eq('friend_id', user.id)
      .eq('status', 'pending');

    if (requests) {
      const formattedRequests = requests
        .map(r => ({
          ...r,
          requester: r.requester as unknown as Profile
        }))
        .filter(r => r.requester !== null) as FriendRequest[];
      setPendingRequests(formattedRequests);
    }

    // Get sent requests (people we sent requests to)
    const { data: sent } = await supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (sent) {
      setSentRequests(sent.map(s => s.friend_id));
    }

    // Get all users for discovery (excluding current user)
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .limit(50);

    if (users) {
      setAllUsers(users as unknown as Profile[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) return [];
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('user_id', user?.id || '')
      .limit(20);
    
    return (data || []) as unknown as Profile[];
  };

  // Send a friend request (pending status) with push notification
  const sendFriendRequest = async (friendId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Get sender's profile for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      });

    if (!error) {
      setSentRequests(prev => [...prev, friendId]);
      
      // Send push notification to recipient
      const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';
      notifyFriendRequest(friendId, senderName);
    }

    return { error };
  };

  // Accept a friend request with push notification
  const acceptFriendRequest = async (requestId: string, requesterId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Get acceptor's profile for notification
    const { data: acceptorProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', user.id)
      .single();

    // Update the request status to accepted
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      // Create reverse friendship (so both users see each other as friends)
      await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: requesterId,
          status: 'accepted',
        });

      // Send push notification to the requester
      const acceptorName = acceptorProfile?.display_name || acceptorProfile?.username || 'Someone';
      notifyFriendAccepted(requesterId, acceptorName);

      fetchFriends();
    }

    return { error };
  };

  // Decline a friend request
  const declineFriendRequest = async (requestId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (!error) {
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    }

    return { error };
  };

  // Cancel a sent friend request
  const cancelFriendRequest = async (friendId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', friendId)
      .eq('status', 'pending');

    if (!error) {
      setSentRequests(prev => prev.filter(id => id !== friendId));
    }

    return { error };
  };

  // Check if we sent a request to this user
  const hasSentRequest = (userId: string) => sentRequests.includes(userId);

  // Check if this user is already a friend
  const isFriend = (userId: string) => friends.some(f => f.user_id === userId);

  return { 
    friends, 
    topFriends, 
    pendingRequests,
    sentRequests,
    allUsers, 
    loading, 
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest,
    hasSentRequest,
    isFriend,
    searchUsers, 
    refetch: fetchFriends 
  };
};
