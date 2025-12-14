import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { notifyNewLike, notifyReaction } from '@/utils/pushNotifications';

export const useFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    const { data, error } = await supabase
      .from('challenge_responses')
      .select(`
        *,
        user:profiles!challenge_responses_user_id_fkey(*),
        challenge:challenges!challenge_responses_challenge_id_fkey(
          *,
          from_user:profiles!challenges_from_user_id_fkey(*)
        ),
        reactions(user_id, emoji)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setPosts(data as ChallengeResponse[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const addReaction = async (responseId: string, emoji: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Check if user already reacted
    const post = posts.find(p => p.id === responseId);
    const existingReaction = post?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);

    if (existingReaction) {
      // Remove reaction
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('response_id', responseId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (!error) {
        // Update local state immediately
        setPosts(prev => prev.map(p => {
          if (p.id === responseId) {
            return {
              ...p,
              reactions: (p.reactions || []).filter(r => !(r.user_id === user.id && r.emoji === emoji))
            };
          }
          return p;
        }));
      }
      return { error };
    } else {
      // Add reaction
      const { error } = await supabase
        .from('reactions')
        .upsert({
          response_id: responseId,
          user_id: user.id,
          emoji,
        });

      if (!error) {
        // Update local state immediately
        setPosts(prev => prev.map(p => {
          if (p.id === responseId) {
            return {
              ...p,
              reactions: [...(p.reactions || []), { user_id: user.id, emoji }]
            };
          }
          return p;
        }));

        // Send push notification to post owner
        if (post && post.user_id !== user.id) {
          const { data: userData } = await supabase
            .from('profiles')
            .select('display_name, username')
            .eq('user_id', user.id)
            .single();
          
          const reactorName = userData?.display_name || userData?.username || 'Someone';
          
          if (emoji === '❤️') {
            notifyNewLike(post.user_id, reactorName, responseId);
          } else {
            notifyReaction(post.user_id, reactorName, emoji, responseId);
          }
        }
      }

      return { error };
    }
  };

  return { posts, loading, refetch: fetchFeed, addReaction };
};
