import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';

export interface FriendWithStatus extends Profile {
  is_top_friend?: boolean;
}

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendWithStatus[]>([]);
  const [topFriends, setTopFriends] = useState<Profile[]>([]);
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

  const addFriend = async (friendId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'accepted',
      });

    if (!error) {
      // Also add reverse friendship
      await supabase
        .from('friendships')
        .insert({
          user_id: friendId,
          friend_id: user.id,
          status: 'accepted',
        });

      fetchFriends();
    }

    return { error };
  };

  return { friends, topFriends, allUsers, loading, addFriend, searchUsers, refetch: fetchFriends };
};
