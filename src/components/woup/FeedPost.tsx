import { useState } from 'react';
import { Heart, MessageCircle, Flame, Sparkles } from 'lucide-react';
import { FeedPost as FeedPostType } from '@/types/woup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FeedPostProps {
  post: FeedPostType;
}

const FeedPost = ({ post }: FeedPostProps) => {
  const [showFront, setShowFront] = useState(true);
  const [liked, setLiked] = useState(false);
  
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    }
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <article className="glass rounded-3xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={post.user.avatar} 
            alt={post.user.displayName}
            className="w-10 h-10 rounded-xl border-2 border-primary/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{post.user.displayName}</span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/20 text-primary text-xs">
                <Flame className="w-3 h-3" />
                <span>{post.user.streak}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</p>
          </div>
        </div>
        
        <div className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 inline mr-1" />
          {post.challenge.challengeText}
        </div>
      </div>
      
      {/* Dual Photo Display */}
      <div 
        className="relative aspect-[4/5] cursor-pointer group"
        onClick={() => setShowFront(!showFront)}
      >
        {/* Main photo */}
        <img 
          src={showFront ? post.response.backPhoto : post.response.frontPhoto}
          alt="Challenge response"
          className="w-full h-full object-cover transition-transform duration-500"
        />
        
        {/* Mini selfie in corner */}
        <div className="absolute top-4 left-4 w-24 h-32 rounded-2xl overflow-hidden border-4 border-card shadow-xl transition-transform duration-300 group-hover:scale-105">
          <img 
            src={showFront ? post.response.frontPhoto : post.response.backPhoto}
            alt="Selfie"
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Tap to switch indicator */}
        <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full glass text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          tap to switch 👆
        </div>
      </div>
      
      {/* Caption & Actions */}
      <div className="p-4">
        {post.response.caption && (
          <p className="mb-3">
            <span className="font-semibold">{post.user.username}</span>{' '}
            {post.response.caption}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLiked(!liked)}
              className={cn(
                "gap-2 rounded-full",
                liked && "text-secondary"
              )}
            >
              <Heart className={cn("w-5 h-5", liked && "fill-current")} />
              <span>{post.response.reactions.length + (liked ? 1 : 0)}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 rounded-full">
              <MessageCircle className="w-5 h-5" />
              <span>reply</span>
            </Button>
          </div>
          
          {/* Reaction bubbles */}
          <div className="flex -space-x-1">
            {post.response.reactions.slice(0, 4).map((reaction, i) => (
              <span 
                key={i} 
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm"
              >
                {reaction.emoji}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
};

export default FeedPost;
