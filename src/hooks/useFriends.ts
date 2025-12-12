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
        .map(f => f.friend)
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
      setAllUsers(users);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFriends();
  }, [user]);

  const addFriend = async (friendId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'accepted', // Auto-accept for now
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

  return { friends, allUsers, loading, addFriend, refetch: fetchFriends };
};
