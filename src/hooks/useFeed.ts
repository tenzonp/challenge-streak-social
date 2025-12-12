import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChallengeResponse } from '@/hooks/useChallenges';

export const useFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
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
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const addReaction = async (responseId: string, emoji: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('reactions')
      .upsert({
        response_id: responseId,
        user_id: user.id,
        emoji,
      });

    if (!error) {
      fetchFeed();
    }

    return { error };
  };

  return { posts, loading, refetch: fetchFeed, addReaction };
};
