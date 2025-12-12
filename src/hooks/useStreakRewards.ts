import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface StreakReward {
  id: string;
  user_id: string;
  reward_type: string;
  streak_count: number;
  claimed_at: string;
}

const STREAK_MILESTONES = [
  { streak: 3, reward: '🔥', title: 'On Fire!', description: '3 day streak!' },
  { streak: 7, reward: '⭐', title: 'Week Warrior', description: '7 day streak!' },
  { streak: 14, reward: '💎', title: 'Diamond Hands', description: '2 week streak!' },
  { streak: 30, reward: '👑', title: 'Monthly Legend', description: '30 day streak!' },
  { streak: 50, reward: '🚀', title: 'Rocket Star', description: '50 day streak!' },
  { streak: 100, reward: '🏆', title: 'Century Champion', description: '100 day streak!' },
];

export const useStreakRewards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<StreakReward[]>([]);
  const [showReward, setShowReward] = useState<typeof STREAK_MILESTONES[0] | null>(null);

  const fetchRewards = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('streak_rewards')
      .select('*')
      .eq('user_id', user.id);

    if (data) {
      setRewards(data);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [user]);

  const checkAndClaimReward = async (currentStreak: number) => {
    if (!user) return;

    const unclaimedMilestone = STREAK_MILESTONES.find(
      m => m.streak === currentStreak && !rewards.some(r => r.streak_count === m.streak)
    );

    if (unclaimedMilestone) {
      const { error } = await supabase
        .from('streak_rewards')
        .insert({
          user_id: user.id,
          reward_type: unclaimedMilestone.reward,
          streak_count: unclaimedMilestone.streak,
        });

      if (!error) {
        setShowReward(unclaimedMilestone);
        fetchRewards();
        
        // Auto-hide after animation
        setTimeout(() => setShowReward(null), 3000);
      }
    }
  };

  const getNextMilestone = (currentStreak: number) => {
    return STREAK_MILESTONES.find(m => m.streak > currentStreak);
  };

  const getClaimedBadges = () => {
    return STREAK_MILESTONES.filter(m => 
      rewards.some(r => r.streak_count === m.streak)
    );
  };

  return { 
    rewards, 
    showReward, 
    setShowReward,
    checkAndClaimReward, 
    getNextMilestone,
    getClaimedBadges,
    STREAK_MILESTONES 
  };
};
