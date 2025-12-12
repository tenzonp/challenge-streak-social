import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';

export interface Competition {
  id: string;
  type: 'weekly' | 'monthly';
  title: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed';
  prize_title: string;
  prize_description: string | null;
  created_at: string;
}

export interface CompetitionEntry {
  id: string;
  competition_id: string;
  user_id: string;
  streak_at_start: number;
  streak_at_end: number | null;
  rank: number | null;
  created_at: string;
  user?: Profile;
  current_streak?: number;
}

export const useCompetitions = () => {
  const { user } = useAuth();
  const [activeCompetitions, setActiveCompetitions] = useState<Competition[]>([]);
  const [leaderboard, setLeaderboard] = useState<CompetitionEntry[]>([]);
  const [userEntry, setUserEntry] = useState<CompetitionEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompetitions = useCallback(async () => {
    const { data } = await supabase
      .from('competitions' as any)
      .select('*')
      .eq('status', 'active')
      .order('end_date', { ascending: true });

    if (data) {
      setActiveCompetitions(data as unknown as Competition[]);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (competitionId: string) => {
    const { data: entries } = await supabase
      .from('competition_entries' as any)
      .select(`
        *,
        user:profiles!competition_entries_user_id_fkey(*)
      `)
      .eq('competition_id', competitionId);

    if (entries) {
      const sorted = (entries as any[])
        .map((e) => ({
          ...e,
          current_streak: e.user?.streak || 0
        }))
        .sort((a, b) => b.current_streak - a.current_streak);

      setLeaderboard(sorted as CompetitionEntry[]);

      if (user) {
        const myEntry = sorted.find((e) => e.user_id === user.id);
        setUserEntry(myEntry || null);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

  useEffect(() => {
    if (activeCompetitions.length > 0) {
      fetchLeaderboard(activeCompetitions[0].id);
    } else {
      setLoading(false);
    }
  }, [activeCompetitions, fetchLeaderboard]);

  const joinCompetition = async (competitionId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak')
      .eq('user_id', user.id)
      .single();

    const { error } = await supabase
      .from('competition_entries' as any)
      .insert({
        competition_id: competitionId,
        user_id: user.id,
        streak_at_start: profile?.streak || 0
      } as any);

    if (!error) {
      fetchLeaderboard(competitionId);
    }

    return { error };
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  return {
    activeCompetitions,
    leaderboard,
    userEntry,
    loading,
    joinCompetition,
    getTimeRemaining,
    refetch: () => activeCompetitions[0] && fetchLeaderboard(activeCompetitions[0].id)
  };
};
