import { Zap, Flame } from 'lucide-react';
import { User } from '@/types/woup';
import { Button } from '@/components/ui/button';

interface FriendCardProps {
  friend: User;
  onChallenge: (userId: string) => void;
}

const FriendCard = ({ friend, onChallenge }: FriendCardProps) => {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 animate-scale-in">
      <img 
        src={friend.avatar} 
        alt={friend.displayName}
        className="w-14 h-14 rounded-2xl border-2 border-border"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold truncate">{friend.displayName}</span>
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
      
      <Button 
        variant="secondary" 
        size="sm"
        onClick={() => onChallenge(friend.id)}
        className="gap-1.5 shrink-0"
      >
        <Zap className="w-4 h-4" />
        challenge
      </Button>
    </div>
  );
};

export default FriendCard;
