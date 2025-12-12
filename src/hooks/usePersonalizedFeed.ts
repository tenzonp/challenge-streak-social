import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChallengeResponse } from '@/hooks/useChallenges';

export const usePersonalizedFeed = (feedType: 'friends' | 'global' = 'friends') => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const fetchViewedPosts = useCallback(async () => {
    if (!user) return new Set<string>();
    
    const { data } = await supabase
      .from('viewed_posts' as any)
      .select('response_id')
      .eq('user_id', user.id);

    return new Set((data || []).map((v: any) => v.response_id));
  }, [user]);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get viewed posts to filter
    const viewed = await fetchViewedPosts();
    setViewedIds(viewed);

    let query = supabase
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
      .limit(50);

    // For friends feed, filter by friends only
    if (feedType === 'friends') {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('friend_id, user_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = (friendships || []).map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );
      friendIds.push(user.id); // Include own posts

      if (friendIds.length > 0) {
        query = query.in('user_id', friendIds);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      // Filter out already viewed posts (keep some for UX)
      const unviewedPosts = data.filter(p => !viewed.has(p.id));
      const viewedPosts = data.filter(p => viewed.has(p.id));
      
      // Prioritize unviewed, then sort by engagement
      const sortedPosts = [...unviewedPosts, ...viewedPosts.slice(0, 5)];
      
      // Sort by engagement score (likes * 2 + recency)
      sortedPosts.sort((a, b) => {
        const aScore = (a.reactions?.length || 0) * 2 + (new Date(a.created_at).getTime() / 1000000000);
        const bScore = (b.reactions?.length || 0) * 2 + (new Date(b.created_at).getTime() / 1000000000);
        return bScore - aScore;
      });

      setPosts(sortedPosts as ChallengeResponse[]);
    }
    setLoading(false);
  }, [user, feedType, fetchViewedPosts]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const markAsViewed = async (responseId: string) => {
    if (!user || viewedIds.has(responseId)) return;

    setViewedIds(prev => new Set([...prev, responseId]));

    await supabase.from('viewed_posts' as any).insert({
      user_id: user.id,
      response_id: responseId,
    } as any);

    // Update engagement view count
    const { data: existing } = await supabase
      .from('post_engagement' as any)
      .select('*')
      .eq('response_id', responseId)
      .single();

    if (existing) {
      await supabase
        .from('post_engagement' as any)
        .update({ views_count: (existing as any).views_count + 1 } as any)
        .eq('response_id', responseId);
    } else {
      await supabase.from('post_engagement' as any).insert({
        response_id: responseId,
        views_count: 1,
      } as any);
    }
  };

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
      // Update engagement
      const { data: existing } = await supabase
        .from('post_engagement' as any)
        .select('*')
        .eq('response_id', responseId)
        .single();

      if (existing) {
        await supabase
          .from('post_engagement' as any)
          .update({ likes_count: (existing as any).likes_count + 1 } as any)
          .eq('response_id', responseId);
      } else {
        await supabase.from('post_engagement' as any).insert({
          response_id: responseId,
          likes_count: 1,
        } as any);
      }

      fetchFeed();
    }

    return { error };
  };

  return { posts, loading, refetch: fetchFeed, addReaction, markAsViewed };
};
