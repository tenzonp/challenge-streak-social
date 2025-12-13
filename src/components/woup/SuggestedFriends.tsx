import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';
import { UserPlus, Users, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestedUser extends Profile {
  mutualFriends: number;
  sharedInterests: string[];
  reason: string;
}

interface SuggestedFriendsProps {
  friends: Profile[];
  sentRequests: string[];
  onSendRequest: (userId: string) => void;
  onClose?: () => void;
}

const SuggestedFriends = ({ friends, sentRequests, onSendRequest, onClose }: SuggestedFriendsProps) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchSuggestions();
    }
  }, [user, friends]);

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get current user's interests
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('interests')
        .eq('user_id', user.id)
        .single();

      const myInterests = (myProfile?.interests as string[] | null) || [];
      setUserInterests(myInterests);

      const friendIds = friends.map(f => f.user_id);
      
      // Get friends of friends (mutual friends)
      const { data: friendsOfFriends } = await supabase
        .from('friendships')
        .select(`
          friend:profiles!friendships_friend_id_fkey(*)
        `)
        .in('user_id', friendIds)
        .eq('status', 'accepted');

      // Get all users for interest matching
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .not('user_id', 'in', `(${[...friendIds, ...sentRequests].join(',') || 'null'})`)
        .limit(100);

      const suggestedMap = new Map<string, SuggestedUser>();

      // Process friends of friends
      friendsOfFriends?.forEach(fof => {
        const profile = fof.friend as unknown as Profile;
        if (!profile || profile.user_id === user.id || friendIds.includes(profile.user_id) || sentRequests.includes(profile.user_id)) {
          return;
        }

        const existing = suggestedMap.get(profile.user_id);
        if (existing) {
          existing.mutualFriends += 1;
        } else {
          const profileInterests = (profile.interests as string[] | null) || [];
          const sharedInterests = myInterests.filter(i => profileInterests.includes(i));
          suggestedMap.set(profile.user_id, {
            ...profile,
            mutualFriends: 1,
            sharedInterests,
            reason: 'mutual friends'
          });
        }
      });

      // Process users with shared interests
      allUsers?.forEach(profile => {
        if (suggestedMap.has(profile.user_id)) {
          // Already in suggestions, update shared interests
          const existing = suggestedMap.get(profile.user_id)!;
          const profileInterests = (profile.interests as string[] | null) || [];
          existing.sharedInterests = myInterests.filter(i => profileInterests.includes(i));
          if (existing.sharedInterests.length > 0 && existing.mutualFriends === 0) {
            existing.reason = 'shared interests';
          }
        } else {
          const profileInterests = (profile.interests as string[] | null) || [];
          const sharedInterests = myInterests.filter(i => profileInterests.includes(i));
          if (sharedInterests.length > 0) {
            suggestedMap.set(profile.user_id, {
              ...profile as unknown as Profile,
              mutualFriends: 0,
              sharedInterests,
              reason: 'shared interests'
            });
          }
        }
      });

      // Sort by mutual friends first, then shared interests
      const sorted = Array.from(suggestedMap.values()).sort((a, b) => {
        if (b.mutualFriends !== a.mutualFriends) return b.mutualFriends - a.mutualFriends;
        return b.sharedInterests.length - a.sharedInterests.length;
      });

      setSuggestions(sorted.slice(0, 10));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center gap-2 py-8">
          <motion.div
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-neon-pink"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 rounded-full bg-neon-cyan"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">no suggestions yet</p>
        <p className="text-muted-foreground/70 text-xs mt-1">add more friends to get recommendations!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-neon-pink" />
          <span className="text-sm font-medium text-foreground">suggested for you</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-2xl glass hover:bg-muted/50 transition-all group"
            >
              <div className="relative">
                <img
                  src={suggestion.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${suggestion.user_id}`}
                  alt={suggestion.display_name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-border group-hover:border-primary/50 transition-colors"
                />
                {suggestion.mutualFriends > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neon-cyan flex items-center justify-center text-[10px] font-bold text-background">
                    {suggestion.mutualFriends}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{suggestion.display_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{suggestion.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  {suggestion.mutualFriends > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan">
                      {suggestion.mutualFriends} mutual
                    </span>
                  )}
                  {suggestion.sharedInterests.length > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/20 text-neon-pink truncate max-w-[100px]">
                      {suggestion.sharedInterests.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => onSendRequest(suggestion.user_id)}
                className="h-8 px-3 gap-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="text-xs">add</span>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SuggestedFriends;
