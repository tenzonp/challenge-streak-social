import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, Bookmark, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBookmarks } from '@/hooks/useBookmarks';
import CommentsSection from './CommentsSection';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PostDetailModalProps {
  post: {
    id: string;
    front_photo_url?: string;
    back_photo_url: string;
    caption?: string | null;
    created_at: string;
    user_id: string;
    challenge_id?: string;
  };
  user?: Profile;
  onClose: () => void;
  onViewProfile?: (user: Profile) => void;
}

const PostDetailModal = ({ post, user: postUser, onClose, onViewProfile }: PostDetailModalProps) => {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [reactions, setReactions] = useState<{ emoji: string; user_id: string }[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{ challenge_text: string } | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [engagement, setEngagement] = useState({ likes: 0, comments: 0, views: 0 });

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch reactions
      const { data: reactionsData } = await supabase
        .from('reactions')
        .select('emoji, user_id')
        .eq('response_id', post.id);
      
      if (reactionsData) {
        setReactions(reactionsData);
        const myReaction = reactionsData.find(r => r.user_id === user?.id);
        if (myReaction) setUserReaction(myReaction.emoji);
      }

      // Fetch challenge text if exists
      if (post.challenge_id) {
        const { data: challengeData } = await supabase
          .from('challenges')
          .select('challenge_text')
          .eq('id', post.challenge_id)
          .maybeSingle();
        
        if (challengeData) setChallenge(challengeData);
      }

      // Fetch engagement stats
      const { data: engagementData } = await supabase
        .from('post_engagement')
        .select('likes_count, replies_count, views_count')
        .eq('response_id', post.id)
        .maybeSingle();
      
      if (engagementData) {
        setEngagement({
          likes: engagementData.likes_count || 0,
          comments: engagementData.replies_count || 0,
          views: engagementData.views_count || 0,
        });
      }
    };

    fetchData();
  }, [post.id, post.challenge_id, user?.id]);

  const handleReaction = async (emoji: string) => {
    if (!user) return;

    if (userReaction === emoji) {
      // Remove reaction
      await supabase
        .from('reactions')
        .delete()
        .eq('response_id', post.id)
        .eq('user_id', user.id);
      setUserReaction(null);
      setReactions(prev => prev.filter(r => r.user_id !== user.id));
    } else {
      // Remove existing and add new
      await supabase
        .from('reactions')
        .delete()
        .eq('response_id', post.id)
        .eq('user_id', user.id);
      
      await supabase
        .from('reactions')
        .insert({ response_id: post.id, user_id: user.id, emoji });
      
      setUserReaction(emoji);
      setReactions(prev => [...prev.filter(r => r.user_id !== user.id), { emoji, user_id: user.id }]);
    }
  };

  const handleBookmark = () => {
    toggleBookmark(post.id);
  };

  const reactionEmojis = ['❤️', '🔥', '😂', '😍', '💀', '👏'];
  const groupedReactions = reactionEmojis.map(emoji => ({
    emoji,
    count: reactions.filter(r => r.emoji === emoji).length,
    isActive: userReaction === emoji,
  })).filter(r => r.count > 0 || r.isActive);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
        onClick={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
          <h2 className="font-bold">Post</h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* User Info */}
          {postUser && (
            <button
              onClick={() => onViewProfile?.(postUser)}
              className="flex items-center gap-3 p-4 w-full text-left hover:bg-muted/20 transition-colors"
            >
              <img
                src={postUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${postUser.user_id}`}
                alt={postUser.display_name}
                className="w-12 h-12 rounded-2xl border-2"
                style={{ borderColor: postUser.color_primary || 'transparent' }}
              />
              <div className="flex-1">
                <p className="font-bold">{postUser.display_name}</p>
                <p className="text-sm text-muted-foreground">@{postUser.username}</p>
              </div>
              <span className="text-xs text-muted-foreground">{formatTime(post.created_at)}</span>
            </button>
          )}

          {/* Challenge Banner */}
          {challenge && (
            <div className="mx-4 mb-4 px-4 py-3 rounded-2xl gradient-challenge relative overflow-hidden">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold">Challenge</p>
                  <p className="text-white font-bold text-sm leading-tight">{challenge.challenge_text}</p>
                </div>
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-2xl"
                >
                  ⚡
                </motion.span>
              </div>
            </div>
          )}

          {/* Photo */}
          <div className="relative mx-4 rounded-3xl overflow-hidden">
            <img
              src={post.back_photo_url}
              alt="Post"
              className="w-full aspect-[4/5] object-cover"
            />
            {post.front_photo_url && (
              <div className="absolute top-4 left-4 w-20 h-28 rounded-xl overflow-hidden border-2 border-card shadow-lg">
                <img
                  src={post.front_photo_url}
                  alt="Selfie"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Caption */}
          {post.caption && (
            <div className="px-4 py-3">
              <p className="text-lg">{post.caption}</p>
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center gap-6 px-4 py-3 text-sm text-muted-foreground">
            <span>{engagement.likes} likes</span>
            <span>{engagement.comments} comments</span>
            <span>{engagement.views} views</span>
          </div>

          {/* Reactions */}
          <div className="px-4 py-2 border-y border-border/50">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {reactionEmojis.map(emoji => {
                const reaction = groupedReactions.find(r => r.emoji === emoji);
                const isActive = userReaction === emoji;
                const count = reaction?.count || 0;
                
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 rounded-full text-sm transition-all",
                      isActive
                        ? "bg-primary/20 border border-primary/50 scale-105"
                        : "bg-muted/50 border border-transparent hover:bg-muted"
                    )}
                  >
                    <span className="text-lg">{emoji}</span>
                    {count > 0 && <span className="font-bold">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-around py-3 border-b border-border/50">
            <Button variant="ghost" className="gap-2" onClick={() => handleReaction('❤️')}>
              <Heart className={cn("w-5 h-5", userReaction && "fill-destructive text-destructive")} />
              Like
            </Button>
            <Button variant="ghost" className="gap-2" onClick={() => setShowComments(true)}>
              <MessageCircle className="w-5 h-5" />
              Comment
            </Button>
            <Button variant="ghost" className="gap-2" onClick={handleBookmark}>
              <Bookmark className={cn("w-5 h-5", isBookmarked(post.id) && "fill-primary text-primary")} />
              Save
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <CommentsSection 
            responseId={post.id} 
            onClose={() => setShowComments(false)} 
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default PostDetailModal;
