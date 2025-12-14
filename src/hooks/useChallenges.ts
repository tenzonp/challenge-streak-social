import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';

export interface Challenge {
  id: string;
  from_user_id: string;
  to_user_id: string;
  challenge_text: string;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  expires_at: string;
  from_user?: Profile;
  to_user?: Profile;
}

export interface ChallengeResponse {
  id: string;
  challenge_id: string;
  user_id: string;
  front_photo_url: string;
  back_photo_url: string;
  caption: string | null;
  created_at: string;
  user?: Profile;
  challenge?: Challenge;
  reactions?: { user_id: string; emoji: string }[];
}

export const useChallenges = () => {
  const { user } = useAuth();
  const [pendingChallenges, setPendingChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        from_user:profiles!challenges_from_user_id_fkey(*),
        to_user:profiles!challenges_to_user_id_fkey(*)
      `)
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingChallenges(data as Challenge[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const sendChallenge = async (toUserId: string, challengeText: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Check if user can receive challenges based on privacy settings
    const { data: privacySettings } = await supabase
      .from('privacy_settings')
      .select('who_can_challenge')
      .eq('user_id', toUserId)
      .single();

    const challengeSetting = privacySettings?.who_can_challenge || 'friends_only';

    if (challengeSetting === 'no_one') {
      return { error: new Error('This user has disabled challenges') };
    }

    if (challengeSetting === 'friends_only') {
      // Check if they are friends (check both directions)
      const { data: friendship1 } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .eq('user_id', user.id)
        .eq('friend_id', toUserId)
        .maybeSingle();

      const { data: friendship2 } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .eq('user_id', toUserId)
        .eq('friend_id', user.id)
        .maybeSingle();

      if (!friendship1 && !friendship2) {
        return { error: new Error('You can only challenge your friends') };
      }
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const { error } = await supabase
      .from('challenges')
      .insert({
        from_user_id: user.id,
        to_user_id: toUserId,
        challenge_text: challengeText,
        expires_at: expiresAt.toISOString(),
      });

    return { error };
  };

  const respondToChallenge = async (
    challengeId: string, 
    frontPhotoUrl: string, 
    backPhotoUrl: string, 
    caption?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Get challenge details for notification
    const { data: challengeData } = await supabase
      .from('challenges')
      .select('from_user_id, challenge_text, from_user:profiles!challenges_from_user_id_fkey(display_name)')
      .eq('id', challengeId)
      .single();

    const { error } = await supabase
      .from('challenge_responses')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        front_photo_url: frontPhotoUrl,
        back_photo_url: backPhotoUrl,
        caption,
      });

    if (!error) {
      fetchChallenges();
      
      // Send notification to challenge sender
      if (challengeData?.from_user_id) {
        try {
          // Get current user's profile for display name
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();
          
          await supabase.functions.invoke('send-notification', {
            body: {
              userId: challengeData.from_user_id,
              title: 'Challenge Completed! 🎉',
              body: `${currentUserProfile?.display_name || 'Someone'} completed your challenge: "${challengeData.challenge_text}"`,
              type: 'challenge_complete'
            }
          });
        } catch (err) {
          console.log('Failed to send completion notification:', err);
        }
      }
    }

    return { error };
  };

  return { pendingChallenges, loading, sendChallenge, respondToChallenge, refetch: fetchChallenges };
};
