import { useState, useEffect } from 'react';
import { X, Trophy, Flame, Crown, Medal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useProfile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';

interface StreakLeaderboardProps {
  onClose: () => void;
  onViewProfile: (user: Profile) => void;
}

const StreakLeaderboard = ({ onClose, onViewProfile }: StreakLeaderboardProps) => {
  const { friends } = useFriends();
  const { profile } = useProfile();
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);

  useEffect(() => {
    if (!profile) return;

    // Combine current user with friends and sort by streak
    const allUsers = [profile, ...friends].sort((a, b) => b.streak - a.streak);
    setLeaderboard(allUsers);
  }, [friends, profile]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 2:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <Star className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRankBg = (index: number) => {
    switch (index) {
      case 0:
        return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
      case 1:
        return 'linear-gradient(135deg, #9ca3af, #6b7280)';
      case 2:
        return 'linear-gradient(135deg, #d97706, #b45309)';
      default:
        return undefined;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="relative w-full max-w-md h-[80vh] glass rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 border-b border-border/50 text-center overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-20" />
          <Button 
            variant="glass" 
            size="icon" 
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="relative">
            <Trophy className="w-12 h-12 mx-auto mb-2 text-primary animate-float" />
            <h2 className="text-2xl font-bold">streak leaders</h2>
            <p className="text-sm text-muted-foreground mt-1">you vs your friends</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flame className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>no friends yet to compete with!</p>
            </div>
          ) : (
            leaderboard.map((user, index) => {
              const isCurrentUser = user.user_id === profile?.user_id;
              
              return (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onViewProfile(user)}
                  className={`w-full glass rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-muted/20 transition-all ${
                    isCurrentUser ? 'ring-2 ring-primary' : ''
                  }`}
                  style={{
                    borderLeft: index < 3 ? `4px solid ${index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#d97706'}` : undefined
                  }}
                >
                  {/* Rank */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: getRankBg(index) || 'hsl(var(--muted))' }}
                  >
                    {index < 3 ? (
                      getRankIcon(index)
                    ) : (
                      <span className="font-bold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img 
                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`}
                    className="w-12 h-12 rounded-xl border-2"
                    style={{ borderColor: user.color_primary || 'transparent' }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {user.display_name}
                        {isCurrentUser && <span className="text-primary ml-1">(you)</span>}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>

                  {/* Streak */}
                  <div className="text-right shrink-0">
                    <div 
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold"
                      style={{ 
                        background: `${user.color_primary || '#4ade80'}20`,
                        color: user.color_primary || '#4ade80'
                      }}
                    >
                      <Flame className="w-4 h-4" />
                      <span className="text-lg">{user.streak}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Your position */}
        {profile && (
          <div className="p-4 border-t border-border/50 glass">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: profile.color_primary || 'hsl(var(--primary))' }}
                >
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">your streak</p>
                  <p className="font-bold text-xl">{profile.streak} days</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">rank</p>
                <p className="font-bold text-xl">
                  #{leaderboard.findIndex(u => u.user_id === profile.user_id) + 1}
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StreakLeaderboard;