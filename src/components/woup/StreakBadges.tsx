import { Flame, Zap, Crown, Star, Award, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreakBadgesProps {
  streak: number;
  longestStreak: number;
  size?: 'sm' | 'md' | 'lg';
  showAll?: boolean;
}

const STREAK_BADGES = [
  { threshold: 1, icon: Flame, label: 'First Spark', color: '#f59e0b', bg: '#fef3c7' },
  { threshold: 3, icon: Zap, label: '3 Day Fire', color: '#ef4444', bg: '#fee2e2' },
  { threshold: 7, icon: Star, label: 'Week Warrior', color: '#8b5cf6', bg: '#ede9fe' },
  { threshold: 14, icon: Award, label: '2 Week Legend', color: '#3b82f6', bg: '#dbeafe' },
  { threshold: 30, icon: Trophy, label: 'Monthly Master', color: '#10b981', bg: '#d1fae5' },
  { threshold: 100, icon: Crown, label: 'Century King', color: '#f472b6', bg: '#fce7f3' },
];

export const StreakBadges = ({ streak, longestStreak, size = 'md', showAll = false }: StreakBadgesProps) => {
  const earnedBadges = STREAK_BADGES.filter(b => streak >= b.threshold || longestStreak >= b.threshold);
  const displayBadges = showAll ? STREAK_BADGES : earnedBadges;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge, i) => {
        const isEarned = streak >= badge.threshold || longestStreak >= badge.threshold;
        const Icon = badge.icon;
        
        return (
          <motion.div
            key={badge.threshold}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.1, type: 'spring' }}
            className={cn(
              sizeClasses[size],
              "rounded-xl flex items-center justify-center relative group cursor-pointer",
              isEarned ? "shadow-lg" : "opacity-40 grayscale"
            )}
            style={{ 
              background: isEarned ? badge.bg : 'hsl(var(--muted))',
            }}
          >
            <Icon 
              className={iconSizes[size]} 
              style={{ color: isEarned ? badge.color : 'hsl(var(--muted-foreground))' }}
            />
            
            {/* Tooltip */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-popover text-popover-foreground text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none z-10">
              {badge.label}
              {!isEarned && <span className="text-muted-foreground ml-1">({badge.threshold} days)</span>}
            </div>
            
            {/* Glow effect for earned */}
            {isEarned && (
              <div 
                className="absolute inset-0 rounded-xl animate-pulse"
                style={{ 
                  boxShadow: `0 0 15px ${badge.color}40`,
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export const DayStreakCounter = ({ streak, size = 'md' }: { streak: number; size?: 'sm' | 'md' | 'lg' }) => {
  const currentBadge = [...STREAK_BADGES].reverse().find(b => streak >= b.threshold) || STREAK_BADGES[0];
  const nextBadge = STREAK_BADGES.find(b => b.threshold > streak);
  const progress = nextBadge ? ((streak - (currentBadge?.threshold || 0)) / (nextBadge.threshold - (currentBadge?.threshold || 0))) * 100 : 100;

  const containerSizes = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={cn("glass rounded-2xl", containerSizes[size])}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Flame className="w-6 h-6 text-secondary" />
          </motion.div>
          <div>
            <span className="text-2xl font-black text-gradient-primary">{streak}</span>
            <span className="text-muted-foreground ml-1 text-sm">day streak</span>
          </div>
        </div>
        
        {currentBadge && (
          <div 
            className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
            style={{ background: currentBadge.bg, color: currentBadge.color }}
          >
            <currentBadge.icon className="w-3 h-3" />
            {currentBadge.label}
          </div>
        )}
      </div>
      
      {nextBadge && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Next: {nextBadge.label}</span>
            <span>{nextBadge.threshold - streak} days to go</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div 
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${currentBadge?.color || '#4ade80'}, ${nextBadge.color})` }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StreakBadges;
