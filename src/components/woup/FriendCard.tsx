import { Zap, Flame, UserPlus, MessageCircle, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';

interface FriendCardProps {
  friend: Profile;
  onChallenge: (userId: string) => void;
  onChat?: (user: Profile) => void;
  onViewProfile?: (user: Profile) => void;
  showAddButton?: boolean;
  onAdd?: (userId: string) => void;
}

const FriendCard = ({ friend, onChallenge, onChat, onViewProfile, showAddButton, onAdd }: FriendCardProps) => {
  return (
    <div 
      className="glass rounded-2xl overflow-hidden animate-scale-in"
      style={{
        borderLeft: friend.color_primary ? `3px solid ${friend.color_primary}` : undefined
      }}
    >
      {/* Clickable profile area */}
      <button 
        onClick={() => onViewProfile?.(friend)}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="relative">
          <img 
            src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`} 
            alt={friend.display_name}
            className="w-14 h-14 rounded-2xl border-2"
            style={{ borderColor: friend.color_primary || 'transparent' }}
          />
          {friend.current_song && (
            <div 
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: friend.color_secondary || '#f472b6' }}
            >
              <Music className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold truncate">{friend.display_name}</span>
            <div 
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs shrink-0"
              style={{ 
                background: `${friend.color_primary || '#4ade80'}20`,
                color: friend.color_primary || '#4ade80'
              }}
            >
              <Flame className="w-3 h-3" />
              <span>{friend.streak}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
          {friend.vibe && (
            <p className="text-xs mt-0.5 truncate" style={{ color: friend.color_secondary || '#f472b6' }}>
              {friend.vibe}
            </p>
          )}
          {friend.current_song && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              🎵 {friend.current_song} - {friend.current_artist}
            </p>
          )}
        </div>
      </button>
      
      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4 pt-0">
        {showAddButton && onAdd && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAdd(friend.user_id)}
            className="gap-1"
          >
            <UserPlus className="w-4 h-4" />
            add
          </Button>
        )}
        {onChat && (
          <Button 
            variant="glass" 
            size="sm"
            onClick={() => onChat(friend)}
            className="gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            chat
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onChallenge(friend.user_id)}
          className="gap-1 flex-1"
        >
          <Zap className="w-4 h-4" />
          challenge
        </Button>
      </div>
    </div>
  );
};

export default FriendCard;
