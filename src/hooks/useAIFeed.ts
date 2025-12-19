import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChallengeResponse } from '@/hooks/useChallenges';

const PAGE_SIZE = 15;

export const useAIFeed = (feedType: 'friends' | 'global' = 'friends') => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const blockedIdsRef = useRef<string[]>([]);
  const friendIdsRef = useRef<string[]>([]);
  const fetchedRef = useRef(false);

  const fetchFeed = useCallback(async (cursor?: string, append = false) => {
    if (!user) return;
    
    // Prevent double fetch on mount
    if (!append && fetchedRef.current) return;
    if (!append) fetchedRef.current = true;
    
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Only fetch setup data on initial load
      if (!append) {
        const [viewedResult, blockedResult, friendsResult] = await Promise.all([
          supabase
            .from('viewed_posts' as any)
            .select('response_id')
            .eq('user_id', user.id)
            .limit(200),
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

        viewedIdsRef.current = new Set((viewedResult.data || []).map((v: any) => v.response_id));

        blockedIdsRef.current = (blockedResult.data || [])
          .map(b => (b.user_id === user.id ? b.friend_id : b.user_id))
          .filter(id => id !== user.id);

        if (feedType === 'friends' && friendsResult.data) {
          friendIdsRef.current = (friendsResult.data || []).map((f: any) => 
            f.user_id === user.id ? f.friend_id : f.user_id
          );
          friendIdsRef.current.push(user.id);
        }
      }

      // Build query
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
        .limit(PAGE_SIZE + 1);

      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      if (blockedIdsRef.current.length > 0) {
        query = query.not('user_id', 'in', `(${blockedIdsRef.current.join(',')})`);
      }

      if (feedType === 'friends' && friendIdsRef.current.length > 0) {
        query = query.in('user_id', friendIdsRef.current);
      }

      const { data: postsData, error } = await query;

      if (error) {
        console.error('Error fetching feed:', error);
        return;
      }

      const fetchedPosts = postsData || [];
      const hasMorePosts = fetchedPosts.length > PAGE_SIZE;
      setHasMore(hasMorePosts);

      const postsToAdd = hasMorePosts ? fetchedPosts.slice(0, PAGE_SIZE) : fetchedPosts;

      if (append) {
        setPosts(prev => [...prev, ...postsToAdd] as ChallengeResponse[]);
      } else {
        // Sort initial posts - unviewed first, then by engagement
        const viewedSet = viewedIdsRef.current;
        const sortedPosts = [...postsToAdd].sort((a, b) => {
          const aViewed = viewedSet.has(a.id);
          const bViewed = viewedSet.has(b.id);
          if (!aViewed && bViewed) return -1;
          if (aViewed && !bViewed) return 1;
          
          const aScore = (a.reactions?.length || 0) * 2 + (new Date(a.created_at).getTime() / 1e12);
          const bScore = (b.reactions?.length || 0) * 2 + (new Date(b.created_at).getTime() / 1e12);
          return bScore - aScore;
        });
        setPosts(sortedPosts as unknown as ChallengeResponse[]);
      }

    } catch (e) {
      console.error('Feed fetch error:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, feedType]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    
    const lastPost = posts[posts.length - 1];
    if (lastPost?.created_at) {
      fetchFeed(lastPost.created_at, true);
    }
  }, [posts, loadingMore, hasMore, fetchFeed]);

  // Reset on feedType change
  useEffect(() => {
    fetchedRef.current = false;
    setPosts([]);
    setHasMore(true);
    fetchFeed();
  }, [user?.id, feedType]);

  const markAsViewed = useCallback(async (responseId: string) => {
    if (!user || viewedIdsRef.current.has(responseId)) return;

    viewedIdsRef.current.add(responseId);

    await supabase.from('viewed_posts' as any).insert({
      user_id: user.id,
      response_id: responseId,
    } as any);

    supabase.rpc('increment_post_views', { p_response_id: responseId });
  }, [user]);

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
      setPosts(prev => prev.map(p => 
        p.id === responseId 
          ? { ...p, reactions: [...(p.reactions || []), { user_id: user.id, emoji }] }
          : p
      ));
    }

    return { error };
  }, [user]);

  const refetch = useCallback(() => {
    fetchedRef.current = false;
    setPosts([]);
    fetchFeed();
  }, [fetchFeed]);

  return { 
    posts, 
    loading, 
    loadingMore,
    hasMore,
    refetch,
    loadMore,
    addReaction, 
    markAsViewed,
  };
};
