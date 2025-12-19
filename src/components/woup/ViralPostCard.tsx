import { memo, useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Flag, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookmarks } from '@/hooks/useBookmarks';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import PostShareCard from './PostShareCard';
import CommentsSection from './CommentsSection';
import ReportPostModal from './ReportPostModal';

interface ViralPostCardProps {
  post: ChallengeResponse;
  onReact: (responseId: string, emoji: string) => void;
  onViewProfile?: (user: Profile) => void;
  onView?: (responseId: string) => void;
  isNew?: boolean;
}

const ViralPostCard = ({ post, onReact, onViewProfile, onView, isNew }: ViralPostCardProps) => {
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [showFront, setShowFront] = useState(true);
  const [liked, setLiked] = useState(post.reactions?.some((r) => r.user_id === user?.id && r.emoji === '❤️'));
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [locallyHidden, setLocallyHidden] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasViewed = useRef(false);
  const saved = isBookmarked(post.id);
  const isHidden = (post as any).is_hidden;
  const isFlagged = (post as any).is_flagged;

  useEffect(() => {
    if (!cardRef.current || hasViewed.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasViewed.current) {
          hasViewed.current = true;
          onView?.(post.id);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, onView]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m`;
    }
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const handleDoubleTap = () => {
    if (!liked) {
      setLiked(true);
      setShowHeartAnimation(true);
      onReact(post.id, '❤️');
      setTimeout(() => setShowHeartAnimation(false), 600);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    if (!liked) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 600);
    }
    onReact(post.id, '❤️');
  };

  const handleBlockUser = async () => {
    if (!user || !post.user_id) return;

    const confirmBlock = window.confirm(`Block @${post.user?.username || 'this user'}?`);
    if (!confirmBlock) return;

    setIsBlocking(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .upsert(
          {
            user_id: user.id,
            friend_id: post.user_id,
            status: 'blocked',
          } as any,
          { onConflict: 'user_id,friend_id' } as any
        );

      if (error) {
        toast.error('Failed to block user');
      } else {
        setLocallyHidden(true);
        toast.success('User blocked');
      }
    } catch (e) {
      toast.error('Failed to block user');
    } finally {
      setIsBlocking(false);
    }
  };

  const likeCount = (post.reactions?.length || 0) + (liked && !post.reactions?.some((r) => r.user_id === user?.id) ? 1 : 0);

  if (isHidden || locallyHidden) return null;

  return (
    <>
      <article ref={cardRef} className="border-b border-border">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 flex items-start gap-3">
          <button
            onClick={() => onViewProfile?.(post.user!)}
            className="shrink-0"
          >
            <img
              src={post.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`}
              alt={post.user?.display_name || 'User'}
              loading="lazy"
              decoding="async"
              className="w-9 h-9 rounded-full object-cover"
            />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onViewProfile?.(post.user!)}
                className="flex items-center gap-1.5 text-left"
              >
                <span className="font-semibold text-sm">{post.user?.username}</span>
                <span className="text-muted-foreground text-sm">· {formatTime(post.created_at)}</span>
              </button>

              {user && post.user_id !== user.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-card border-border">
                    <DropdownMenuItem
                      onClick={() => setShowReportModal(true)}
                      className="text-destructive cursor-pointer"
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlockUser} disabled={isBlocking} className="cursor-pointer">
                      <UserX className="w-4 h-4 mr-2" />
                      Block
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Challenge text */}
            {post.challenge && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Challenge: {post.challenge.challenge_text}
              </p>
            )}

            {/* Caption */}
            {post.caption && (
              <p className="text-sm mt-1">{post.caption}</p>
            )}
          </div>
        </div>

        {/* Photo Display */}
        <div
          className="relative aspect-[4/5] cursor-pointer mx-4 rounded-xl overflow-hidden"
          onClick={() => setShowFront(!showFront)}
          onDoubleClick={handleDoubleTap}
        >
          <img
            key={showFront ? 'front' : 'back'}
            src={showFront ? post.back_photo_url : post.front_photo_url}
            alt="Post"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />

          {/* Mini selfie */}
          <div
            className="absolute top-3 left-3 w-16 h-20 rounded-lg overflow-hidden border-2 border-background shadow-lg cursor-pointer"
          >
            <img
              src={showFront ? post.front_photo_url : post.back_photo_url}
              alt="Selfie"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Heart animation */}
          <AnimatePresence>
            {showHeartAnimation && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="w-20 h-20 text-accent-red fill-current" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tap hint */}
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
            tap to flip
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleLike} className="flex items-center gap-1.5">
              <Heart className={cn('w-6 h-6', liked && 'fill-accent-red text-accent-red')} />
              {likeCount > 0 && <span className="text-sm">{likeCount}</span>}
            </button>

            <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5">
              <MessageCircle className="w-6 h-6" />
            </button>

            <button onClick={() => setShowShareModal(true)}>
              <Send className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={async () => {
              await toggleBookmark(post.id);
              toast.success(saved ? 'Removed' : 'Saved');
            }}
          >
            <Bookmark className={cn('w-6 h-6', saved && 'fill-current')} />
          </button>
        </div>

        {/* Streak badge */}
        {(post.user?.streak || 0) >= 3 && (
          <div className="px-4 pb-3">
            <span className="text-xs text-muted-foreground">
              🔥 {post.user?.streak} day streak
            </span>
          </div>
        )}

        {/* Flagged indicator */}
        {isFlagged && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground flex items-center gap-2">
            <Flag className="w-4 h-4" />
            <span>Under review</span>
          </div>
        )}

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && <PostShareCard post={post} onClose={() => setShowShareModal(false)} />}
        </AnimatePresence>

        {/* Comments Modal */}
        <AnimatePresence>
          {showComments && <CommentsSection responseId={post.id} onClose={() => setShowComments(false)} />}
        </AnimatePresence>
      </article>

      {user && post.user_id !== user.id && (
        <ReportPostModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} responseId={post.id} />
      )}
    </>
  );
};

export default memo(ViralPostCard);