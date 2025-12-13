import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  response_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  likes_count: number;
  user?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    color_primary: string | null;
  };
  replies?: Comment[];
  isLiked?: boolean;
}

export const useComments = (responseId: string) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    
    // Fetch all comments for this post
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select('*')
      .eq('response_id', responseId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      setLoading(false);
      return;
    }

    // Fetch user profiles for comments
    const userIds = [...new Set((commentsData || []).map(c => c.user_id))];
    let usersMap: Record<string, any> = {};
    
    if (userIds.length > 0) {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url, color_primary')
        .in('user_id', userIds);
      
      (usersData || []).forEach(u => {
        usersMap[u.user_id] = u;
      });
    }

    // Fetch user's likes
    let userLikes: string[] = [];
    if (user) {
      const { data: likesData } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id);
      userLikes = (likesData || []).map(l => l.comment_id);
    }

    // Organize into tree structure
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    (commentsData || []).forEach((c: any) => {
      const comment: Comment = {
        ...c,
        user: usersMap[c.user_id] || null,
        replies: [],
        isLiked: userLikes.includes(c.id)
      };
      commentMap.set(c.id, comment);
    });

    commentMap.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    setComments(rootComments);
    setLoading(false);
  }, [responseId, user]);

  const moderateContent = async (text: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('content-moderation', {
        body: { text, type: 'text-only' }
      });
      
      if (error || !data?.isClean) {
        toast.error('Your comment contains inappropriate content');
        return false;
      }
      return true;
    } catch {
      return true; // Allow if moderation fails
    }
  };

  const addComment = async (content: string, parentId?: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return { error: new Error('Not authenticated') };
    }

    // Moderate content first
    const isClean = await moderateContent(content);
    if (!isClean) {
      return { error: new Error('Content flagged') };
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        response_id: responseId,
        user_id: user.id,
        parent_id: parentId || null,
        content
      })
      .select('*')
      .single();

    if (error) {
      toast.error('Failed to add comment');
      return { error };
    }

    // Fetch user profile
    const { data: userData } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_url, color_primary')
      .eq('user_id', user.id)
      .single();

    // Update local state
    const newComment: Comment = {
      ...data,
      user: userData || null,
      replies: [],
      isLiked: false
    };

    if (parentId) {
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), newComment] };
        }
        return c;
      }));
    } else {
      setComments(prev => [...prev, newComment]);
    }

    return { data: newComment };
  };

  const toggleLike = async (commentId: string) => {
    if (!user) return;

    const comment = findComment(comments, commentId);
    if (!comment) return;

    if (comment.isLiked) {
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: user.id });
    }

    // Update local state
    setComments(prev => updateCommentLike(prev, commentId, !comment.isLiked));
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (!error) {
      setComments(prev => removeComment(prev, commentId));
      toast.success('Comment deleted');
    }
  };

  return { comments, loading, fetchComments, addComment, toggleLike, deleteComment };
};

// Helper functions
function findComment(comments: Comment[], id: string): Comment | undefined {
  for (const c of comments) {
    if (c.id === id) return c;
    if (c.replies) {
      const found = findComment(c.replies, id);
      if (found) return found;
    }
  }
  return undefined;
}

function updateCommentLike(comments: Comment[], id: string, isLiked: boolean): Comment[] {
  return comments.map(c => {
    if (c.id === id) {
      return { 
        ...c, 
        isLiked, 
        likes_count: c.likes_count + (isLiked ? 1 : -1) 
      };
    }
    if (c.replies) {
      return { ...c, replies: updateCommentLike(c.replies, id, isLiked) };
    }
    return c;
  });
}

function removeComment(comments: Comment[], id: string): Comment[] {
  return comments
    .filter(c => c.id !== id)
    .map(c => ({
      ...c,
      replies: c.replies ? removeComment(c.replies, id) : []
    }));
}
