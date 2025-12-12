import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B'
};

export const useAchievements = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    const { data } = await supabase
      .from('achievements' as any)
      .select('*')
      .order('rarity');

    if (data) {
      setAchievements(data as unknown as Achievement[]);
    }
  }, []);

  const fetchUserAchievements = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_achievements' as any)
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', user.id);

    if (data) {
      setUserAchievements(data as unknown as UserAchievement[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAchievements();
    fetchUserAchievements();
  }, [fetchAchievements, fetchUserAchievements]);

  const unlockAchievement = async (achievementCode: string) => {
    if (!user) return;

    const achievement = achievements.find(a => a.code === achievementCode);
    if (!achievement) return;

    // Check if already unlocked
    const alreadyUnlocked = userAchievements.some(
      ua => ua.achievement_id === achievement.id
    );
    if (alreadyUnlocked) return;

    const { error } = await supabase
      .from('user_achievements' as any)
      .insert({
        user_id: user.id,
        achievement_id: achievement.id
      } as any);

    if (!error) {
      setNewAchievement(achievement);
      fetchUserAchievements();
    }
  };

  const checkAndUnlock = async (type: string, value: number) => {
    const eligibleAchievements = achievements.filter(
      a => a.requirement_type === type && a.requirement_value <= value
    );

    for (const achievement of eligibleAchievements) {
      const alreadyUnlocked = userAchievements.some(
        ua => ua.achievement_id === achievement.id
      );
      if (!alreadyUnlocked) {
        await unlockAchievement(achievement.code);
        break; // Only unlock one at a time for the animation
      }
    }
  };

  const getProgress = (achievement: Achievement) => {
    const unlocked = userAchievements.some(ua => ua.achievement_id === achievement.id);
    return unlocked ? 100 : 0;
  };

  const getRarityColor = (rarity: Achievement['rarity']) => RARITY_COLORS[rarity];

  return {
    achievements,
    userAchievements,
    newAchievement,
    setNewAchievement,
    loading,
    unlockAchievement,
    checkAndUnlock,
    getProgress,
    getRarityColor,
    RARITY_COLORS
  };
};
