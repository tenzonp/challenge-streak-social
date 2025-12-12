import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useChallengeExpiry = () => {
  const { user } = useAuth();

  const checkExpiredChallenges = useCallback(async () => {
    if (!user) return;

    // Mark expired challenges
    const now = new Date().toISOString();
    await supabase
      .from('challenges')
      .update({ status: 'expired' })
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .lt('expires_at', now);
  }, [user]);

  useEffect(() => {
    // Check on mount
    checkExpiredChallenges();

    // Check every minute
    const interval = setInterval(checkExpiredChallenges, 60000);

    return () => clearInterval(interval);
  }, [checkExpiredChallenges]);

  return { checkExpiredChallenges };
};