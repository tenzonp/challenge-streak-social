import { Zap, Flame, UserPlus, MessageCircle, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';

interface FriendCardProps {
  friend: Profile;
  onChallenge: (userId: string) => void;
  onChat?: (user: Profile) => void;
  showAddButton?: boolean;
  onAdd?: (userId: string) => void;
}

const FriendCard = ({ friend, onChallenge, onChat, showAddButton, onAdd }: FriendCardProps) => {
  return (
    <div 
      className="glass rounded-2xl p-4 flex items-center gap-4 animate-scale-in"
      style={{
        borderLeft: friend.color_primary ? `3px solid ${friend.color_primary}` : undefined
      }}
    >
      <img 
        src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`} 
        alt={friend.display_name}
        className="w-14 h-14 rounded-2xl border-2"
        style={{ borderColor: friend.color_primary || 'transparent' }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold truncate">{friend.display_name}</span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon-green/20 text-primary text-xs shrink-0">
            <Flame className="w-3 h-3" />
            <span>{friend.streak}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
        {friend.vibe && (
          <p className="text-xs mt-0.5" style={{ color: friend.color_secondary || '#f472b6' }}>
            {friend.vibe}
          </p>
        )}
        {friend.current_song && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Music className="w-3 h-3" />
            <span className="truncate">{friend.current_song}</span>
          </div>
        )}
      </div>
      
      <div className="flex gap-2 shrink-0">
        {showAddButton && onAdd && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onAdd(friend.user_id)}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        )}
        {onChat && (
          <Button 
            variant="glass" 
            size="icon"
            onClick={() => onChat(friend)}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onChallenge(friend.user_id)}
          className="gap-1.5"
        >
          <Zap className="w-4 h-4" />
          challenge
        </Button>
      </div>
    </div>
  );
};

export default FriendCard;
