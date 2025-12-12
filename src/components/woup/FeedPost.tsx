import { useState } from 'react';
import { Heart, MessageCircle, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { useAuth } from '@/hooks/useAuth';

interface FeedPostProps {
  post: ChallengeResponse;
  onReact: (responseId: string, emoji: string) => void;
}

const FeedPost = ({ post, onReact }: FeedPostProps) => {
  const { user } = useAuth();
  const [showFront, setShowFront] = useState(true);
  const [liked, setLiked] = useState(
    post.reactions?.some(r => r.user_id === user?.id && r.emoji === '❤️')
  );
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
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

  const handleLike = () => {
    if (!user) return;
    setLiked(!liked);
    onReact(post.id, '❤️');
  };

  return (
    <article className="glass rounded-3xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={post.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`} 
            alt={post.user?.display_name || 'User'}
            className="w-10 h-10 rounded-xl border-2 border-primary/30"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{post.user?.display_name || 'User'}</span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/20 text-primary text-xs">
                <Flame className="w-3 h-3" />
                <span>{post.user?.streak || 0}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
          </div>
        </div>
        
        {post.challenge && (
          <div className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground max-w-32 truncate">
            <Sparkles className="w-3 h-3 inline mr-1" />
            {post.challenge.challenge_text}
          </div>
        )}
      </div>
      
      {/* Dual Photo Display */}
      <div 
        className="relative aspect-[4/5] cursor-pointer group"
        onClick={() => setShowFront(!showFront)}
      >
        {/* Main photo */}
        <img 
          src={showFront ? post.back_photo_url : post.front_photo_url}
          alt="Challenge response"
          className="w-full h-full object-cover transition-transform duration-500"
        />
        
        {/* Mini selfie in corner */}
        <div className="absolute top-4 left-4 w-24 h-32 rounded-2xl overflow-hidden border-4 border-card shadow-xl transition-transform duration-300 group-hover:scale-105">
          <img 
            src={showFront ? post.front_photo_url : post.back_photo_url}
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
        {post.caption && (
          <p className="mb-3">
            <span className="font-semibold">{post.user?.username}</span>{' '}
            {post.caption}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLike}
              className={cn(
                "gap-2 rounded-full",
                liked && "text-secondary"
              )}
            >
              <Heart className={cn("w-5 h-5", liked && "fill-current")} />
              <span>{(post.reactions?.length || 0) + (liked && !post.reactions?.some(r => r.user_id === user?.id) ? 1 : 0)}</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="gap-2 rounded-full">
              <MessageCircle className="w-5 h-5" />
              <span>reply</span>
            </Button>
          </div>
          
          {/* Reaction bubbles */}
          <div className="flex -space-x-1">
            {post.reactions?.slice(0, 4).map((reaction, i) => (
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
