import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Flame, Sparkles, Bookmark, MoreHorizontal, Flag, UserX } from 'lucide-react';
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
  const [liked, setLiked] = useState(
    post.reactions?.some(r => r.user_id === user?.id && r.emoji === '❤️')
  );
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
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    if (!liked) {
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    onReact(post.id, '❤️');
  };

  const handleBlockUser = async () => {
    if (!user || !post.user_id) return;

    const confirmBlock = window.confirm(
      `Block @${post.user?.username || 'this user'}? You won't see their posts.`
    );
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

  const likeCount =
    (post.reactions?.length || 0) +
    (liked && !post.reactions?.some(r => r.user_id === user?.id) ? 1 : 0);

  if (isHidden || locallyHidden) {
    return null;
  }

  return (
    <>
      <motion.article 
        ref={cardRef}
        initial={isNew ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-card rounded-2xl overflow-hidden border border-border/40"
      >
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <button 
            onClick={() => onViewProfile?.(post.user!)}
            className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity"
          >
            <img 
              src={post.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`} 
              alt={post.user?.display_name || 'User'}
              className="w-9 h-9 rounded-xl"
              style={{ 
                border: post.user?.color_primary ? `2px solid ${post.user.color_primary}` : 'none'
              }}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">{post.user?.display_name || 'User'}</span>
                {(post.user?.streak || 0) >= 3 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Flame className="w-3 h-3" style={{ color: post.user?.color_primary || 'hsl(var(--primary))' }} />
                    {post.user?.streak}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{formatTime(post.created_at)}</span>
            </div>
          </button>

          {user && post.user_id !== user.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                <DropdownMenuItem
                  onClick={() => setShowReportModal(true)}
                  className="text-destructive focus:text-destructive cursor-pointer text-sm"
                >
                  <Flag className="w-3.5 h-3.5 mr-2" />
                  Report
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBlockUser}
                  disabled={isBlocking}
                  className="cursor-pointer text-sm"
                >
                  <UserX className="w-3.5 h-3.5 mr-2" />
                  Block
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Challenge Banner */}
        {post.challenge && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground truncate">{post.challenge.challenge_text}</p>
            </div>
          </div>
        )}

        {/* Flagged indicator */}
        {isFlagged && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-xs text-yellow-500 flex items-center gap-2">
            <Flag className="w-3 h-3" />
            <span>Under review</span>
          </div>
        )}
        
        {/* Photo Display */}
        <div 
          className="relative aspect-[4/5] cursor-pointer overflow-hidden"
          onClick={() => setShowFront(!showFront)}
          onDoubleClick={handleDoubleTap}
        >
          <motion.img 
            key={showFront ? 'front' : 'back'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            src={showFront ? post.back_photo_url : post.front_photo_url}
            alt="Post"
            className="w-full h-full object-cover"
          />
          
          {/* Mini selfie */}
          <div 
            className="absolute top-3 left-3 w-16 h-22 rounded-xl overflow-hidden shadow-lg"
            style={{ 
              border: `2px solid ${post.user?.color_primary || 'hsl(var(--border))'}`,
            }}
          >
            <img 
              src={showFront ? post.front_photo_url : post.back_photo_url}
              alt="Selfie"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Double-tap heart */}
          <AnimatePresence>
            {showHeartAnimation && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <Heart className="w-20 h-20 text-secondary fill-current drop-shadow-lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Actions */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLike}
              className={cn("rounded-full h-9 w-9", liked && "text-secondary")}
            >
              <Heart className={cn("w-5 h-5", liked && "fill-current")} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9"
              onClick={() => setShowComments(true)}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-9 w-9"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full h-9 w-9", saved && "text-primary")}
            onClick={async () => {
              await toggleBookmark(post.id);
              toast.success(saved ? 'Removed' : 'Saved');
            }}
          >
            <Bookmark className={cn("w-5 h-5", saved && "fill-current")} />
          </Button>
        </div>

        {/* Caption */}
        <div className="px-3 pb-3 space-y-1">
          {likeCount > 0 && (
            <p className="font-semibold text-xs">{likeCount} likes</p>
          )}
          
          {post.caption && (
            <p className="text-sm">
              <span className="font-semibold">{post.user?.username}</span>{' '}
              <span className="text-foreground/80">{post.caption}</span>
            </p>
          )}
        </div>
        
        {/* Modals */}
        <AnimatePresence>
          {showShareModal && (
            <PostShareCard 
              post={post}
              onClose={() => setShowShareModal(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComments && (
            <CommentsSection
              responseId={post.id}
              onClose={() => setShowComments(false)}
            />
          )}
        </AnimatePresence>
      </motion.article>

      {user && post.user_id !== user.id && (
        <ReportPostModal 
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          responseId={post.id}
        />
      )}
    </>
  );
};

export default ViralPostCard;
