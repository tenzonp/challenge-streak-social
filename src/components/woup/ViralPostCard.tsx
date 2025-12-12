import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Flame, Sparkles, Bookmark, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookmarks } from '@/hooks/useBookmarks';
import { toast } from 'sonner';
import PostShareCard from './PostShareCard';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const hasViewed = useRef(false);
  const saved = isBookmarked(post.id);

  // Track when post comes into view
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

  const likeCount = (post.reactions?.length || 0) + (liked && !post.reactions?.some(r => r.user_id === user?.id) ? 1 : 0);

  return (
    <motion.article 
      ref={cardRef}
      initial={isNew ? { opacity: 0, y: 50, scale: 0.9 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      className="glass rounded-3xl overflow-hidden group"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button 
          onClick={() => onViewProfile?.(post.user!)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
        >
          <div className="relative">
            <img 
              src={post.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`} 
              alt={post.user?.display_name || 'User'}
              className="w-11 h-11 rounded-2xl border-2 transition-transform group-hover:scale-105"
              style={{ borderColor: post.user?.color_primary || 'transparent' }}
            />
            {/* Streak badge */}
            {(post.user?.streak || 0) >= 7 && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                <Flame className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{post.user?.display_name || 'User'}</span>
              <span className="text-muted-foreground text-sm">@{post.user?.username}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatTime(post.created_at)}</span>
              {post.challenge && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    {post.challenge.challenge_text.slice(0, 20)}...
                  </span>
                </>
              )}
            </div>
          </div>
        </button>
        
        <Button variant="ghost" size="icon" className="rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Photo Display - Viral Style */}
      <div 
        className="relative aspect-[4/5] cursor-pointer overflow-hidden"
        onClick={() => setShowFront(!showFront)}
        onDoubleClick={handleDoubleTap}
      >
        {/* Main photo with smooth transition */}
        <motion.img 
          key={showFront ? 'front' : 'back'}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          src={showFront ? post.back_photo_url : post.front_photo_url}
          alt="Challenge response"
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        
        {/* Mini selfie - floating card style */}
        <motion.div 
          className="absolute top-4 left-4 w-20 h-28 rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
          style={{ 
            border: `3px solid ${post.user?.color_primary || 'hsl(var(--primary))'}`,
          }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
        >
          <img 
            src={showFront ? post.front_photo_url : post.back_photo_url}
            alt="Selfie"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Double-tap heart animation */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-secondary fill-current drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Engagement stats overlay */}
        <div className="absolute bottom-4 left-4 right-16 flex items-end gap-2">
          <div className="flex -space-x-2">
            {post.reactions?.slice(0, 3).map((_, i) => (
              <div 
                key={i}
                className="w-8 h-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-sm"
              >
                ❤️
              </div>
            ))}
          </div>
          {likeCount > 3 && (
            <span className="text-sm font-medium text-white drop-shadow-lg">
              +{likeCount - 3} more
            </span>
          )}
        </div>

        {/* Tap indicator */}
        <motion.div 
          className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          tap to flip 🔄
        </motion.div>
      </div>
      
      {/* Actions Bar */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLike}
            className={cn(
              "rounded-full transition-all duration-300",
              liked && "text-secondary scale-110"
            )}
          >
            <Heart className={cn("w-6 h-6", liked && "fill-current")} />
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <MessageCircle className="w-6 h-6" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("rounded-full", saved && "text-primary")}
          onClick={async () => {
            await toggleBookmark(post.id);
            toast.success(saved ? 'Removed from vault' : 'Saved to vault! 🔒');
          }}
        >
          <Bookmark className={cn("w-6 h-6", saved && "fill-current")} />
        </Button>
      </div>

      {/* Caption & Stats */}
      <div className="px-4 pb-4 space-y-2">
        <p className="font-bold text-sm">{likeCount.toLocaleString()} likes</p>
        
        {post.caption && (
          <p className="text-sm">
            <span className="font-bold">{post.user?.username}</span>{' '}
            <span className="text-foreground/90">{post.caption}</span>
          </p>
        )}

        {/* Streak info */}
        <div className="flex items-center gap-2 pt-1">
          <div 
            className="px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
            style={{ 
              background: `${post.user?.color_primary || 'hsl(var(--primary))'}20`,
              color: post.user?.color_primary || 'hsl(var(--primary))'
            }}
          >
            <Flame className="w-3 h-3" />
            {post.user?.streak || 0} day streak
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <PostShareCard 
            post={post}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
};

export default ViralPostCard;
