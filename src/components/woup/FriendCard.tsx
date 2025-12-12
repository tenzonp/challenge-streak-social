import { Zap, Flame, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';

interface FriendCardProps {
  friend: Profile;
  onChallenge: (userId: string) => void;
  showAddButton?: boolean;
  onAdd?: (userId: string) => void;
}

const FriendCard = ({ friend, onChallenge, showAddButton, onAdd }: FriendCardProps) => {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 animate-scale-in">
      <img 
        src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`} 
        alt={friend.display_name}
        className="w-14 h-14 rounded-2xl border-2 border-border"
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
          <p className="text-xs text-accent mt-1">{friend.vibe}</p>
        )}
      </div>
      
      <div className="flex gap-2">
        {showAddButton && onAdd && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => onAdd(friend.user_id)}
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        )}
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => onChallenge(friend.user_id)}
          className="gap-1.5 shrink-0"
        >
          <Zap className="w-4 h-4" />
          challenge
        </Button>
      </div>
    </div>
  );
};

export default FriendCard;
