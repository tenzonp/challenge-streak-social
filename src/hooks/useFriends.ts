import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';

export const useFriends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    // Get accepted friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        friend:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (!error && friendships) {
      const friendProfiles = friendships
        .map(f => f.friend as Profile | null)
        .filter((f): f is Profile => f !== null);
      setFriends(friendProfiles);
    }

    // Get all users for discovery (excluding current user)
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)
      .limit(50);

    if (users) {
      setAllUsers(users as Profile[]);
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
    
    return (data || []) as Profile[];
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

  return { friends, allUsers, loading, addFriend, searchUsers, refetch: fetchFriends };
};
