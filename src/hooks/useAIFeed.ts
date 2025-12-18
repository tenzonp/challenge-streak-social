import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChallengeResponse } from '@/hooks/useChallenges';

export const useAIFeed = (feedType: 'friends' | 'global' = 'friends') => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Batch initial queries for better performance
      const [viewedResult, blockedResult, friendsResult] = await Promise.all([
        supabase
          .from('viewed_posts' as any)
          .select('response_id')
          .eq('user_id', user.id)
          .limit(200), // Limit viewed posts check
        supabase
          .from('friendships')
          .select('user_id, friend_id, status')
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .eq('status', 'blocked'),
        feedType === 'friends' 
          ? supabase
              .from('friendships')
              .select('friend_id, user_id')
              .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
              .eq('status', 'accepted')
          : Promise.resolve({ data: null })
      ]);

      const viewedSet = new Set((viewedResult.data || []).map((v: any) => v.response_id));
      setViewedIds(viewedSet);

      const blockedIds = (blockedResult.data || [])
        .map(b => (b.user_id === user.id ? b.friend_id : b.user_id))
        .filter(id => id !== user.id);

      // Build query with reduced data
      let query = supabase
        .from('challenge_responses')
        .select(`
          id,
          challenge_id,
          created_at,
          caption,
          front_photo_url,
          back_photo_url,
          user_id,
          is_hidden,
          is_flagged,
          user:profiles!challenge_responses_user_id_fkey(user_id,display_name,username,avatar_url,color_primary,streak),
          challenge:challenges!challenge_responses_challenge_id_fkey(challenge_text),
          reactions(user_id, emoji)
        `)
        .order('created_at', { ascending: false })
        .limit(30); // Reduced limit for performance

      if (blockedIds.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIds.join(',')})`);
      }

      // For friends feed, filter by friends
      if (feedType === 'friends' && friendsResult.data) {
        const friendIds = (friendsResult.data || []).map((f: any) => 
          f.user_id === user.id ? f.friend_id : f.user_id
        );
        friendIds.push(user.id);

        if (friendIds.length > 0) {
          query = query.in('user_id', friendIds);
        }
      }

      const { data: postsData, error } = await query;

      if (error) {
        console.error('Error fetching feed:', error);
        setLoading(false);
        return;
      }

      // Skip AI recommendations for performance - use simple sort
      const sortedPosts = [...(postsData || [])].sort((a, b) => {
        const aViewed = viewedSet.has(a.id);
        const bViewed = viewedSet.has(b.id);
        if (!aViewed && bViewed) return -1;
        if (aViewed && !bViewed) return 1;
        
        const aScore = (a.reactions?.length || 0) * 2 + (new Date(a.created_at).getTime() / 1e12);
        const bScore = (b.reactions?.length || 0) * 2 + (new Date(b.created_at).getTime() / 1e12);
        return bScore - aScore;
      });
      setPosts(sortedPosts as unknown as ChallengeResponse[]);

    } catch (e) {
      console.error('Feed fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user, feedType]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const markAsViewed = useCallback(async (responseId: string) => {
    if (!user || viewedIds.has(responseId)) return;

    setViewedIds(prev => new Set([...prev, responseId]));

    await supabase.from('viewed_posts' as any).insert({
      user_id: user.id,
      response_id: responseId,
    } as any);

    // Update engagement
    const { data: existing } = await supabase
      .from('post_engagement' as any)
      .select('*')
      .eq('response_id', responseId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('post_engagement' as any)
        .update({ views_count: ((existing as any).views_count || 0) + 1 } as any)
        .eq('response_id', responseId);
    } else {
      await supabase.from('post_engagement' as any).insert({
        response_id: responseId,
        views_count: 1,
      } as any);
    }
  }, [user, viewedIds]);

  const addReaction = useCallback(async (responseId: string, emoji: string) => {
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
        .maybeSingle();

      if (existing) {
        await supabase
          .from('post_engagement' as any)
          .update({ likes_count: ((existing as any).likes_count || 0) + 1 } as any)
          .eq('response_id', responseId);
      } else {
        await supabase.from('post_engagement' as any).insert({
          response_id: responseId,
          likes_count: 1,
        } as any);
      }

      // Optimistically update local state
      setPosts(prev => prev.map(p => 
        p.id === responseId 
          ? { ...p, reactions: [...(p.reactions || []), { user_id: user.id, emoji }] }
          : p
      ));
    }

    return { error };
  }, [user]);

  return { 
    posts, 
    loading, 
    refetch: fetchFeed, 
    addReaction, 
    markAsViewed,
  };
};
