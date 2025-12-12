import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Bookmark {
  id: string;
  user_id: string;
  response_id: string;
  created_at: string;
  response?: any;
}

export const useBookmarks = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        *,
        response:challenge_responses(
          *,
          user:profiles!challenge_responses_user_id_fkey(*),
          challenge:challenges(*),
          reactions(*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBookmarks(data);
      setBookmarkedIds(new Set(data.map(b => b.response_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const addBookmark = async (responseId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        response_id: responseId,
      });

    if (!error) {
      setBookmarkedIds(prev => new Set([...prev, responseId]));
      fetchBookmarks();
      return true;
    }
    return false;
  };

  const removeBookmark = async (responseId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('response_id', responseId);

    if (!error) {
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(responseId);
        return newSet;
      });
      fetchBookmarks();
      return true;
    }
    return false;
  };

  const toggleBookmark = async (responseId: string): Promise<boolean> => {
    if (bookmarkedIds.has(responseId)) {
      return removeBookmark(responseId);
    } else {
      return addBookmark(responseId);
    }
  };

  const isBookmarked = (responseId: string): boolean => {
    return bookmarkedIds.has(responseId);
  };

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    refetch: fetchBookmarks,
  };
};