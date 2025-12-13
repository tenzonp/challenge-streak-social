import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { Profile } from '@/hooks/useProfile';

interface TopFriendsBadgesProps {
  topFriends: Profile[];
  onViewProfile?: (friend: Profile) => void;
}

const TopFriendsBadges = ({ topFriends, onViewProfile }: TopFriendsBadgesProps) => {
  if (topFriends.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-neon-yellow" />
        <p className="text-xs text-muted-foreground">top friends</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {topFriends.map((friend, index) => (
          <motion.button
            key={friend.user_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onViewProfile?.(friend)}
            className="flex flex-col items-center shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-full animate-glow"
                style={{
                  background: `linear-gradient(135deg, ${friend.color_primary || 'hsl(var(--neon-yellow))'}, ${friend.color_secondary || 'hsl(var(--neon-orange))'})`,
                  filter: 'blur(8px)',
                  opacity: 0.5,
                }}
              />
              <img
                src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
                alt={friend.display_name}
                className="relative w-14 h-14 rounded-full object-cover border-2"
                style={{
                  borderColor: friend.color_primary || 'hsl(var(--neon-yellow))',
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-neon-yellow to-neon-orange flex items-center justify-center border-2 border-background">
                <Crown className="w-2.5 h-2.5 text-background" />
              </div>
            </div>
            <p className="text-xs mt-2 truncate max-w-[60px]">{friend.display_name.split(' ')[0]}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default TopFriendsBadges;
