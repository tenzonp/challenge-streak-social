import { useState, useEffect } from 'react';
import { Flame, Edit2, LogOut, Trophy, ChevronRight, Lock, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useStreakRewards } from '@/hooks/useStreakRewards';
import { usePosts, Post } from '@/hooks/usePosts';
import { useBookmarks } from '@/hooks/useBookmarks';
import { supabase } from '@/integrations/supabase/client';
import { useChallenges, ChallengeResponse } from '@/hooks/useChallenges';
import SpotifyConnect from './SpotifyConnect';
import { StreakBadges, DayStreakCounter } from './StreakBadges';

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
  onShowLeaderboard: () => void;
  onShowVault: () => void;
}

const ProfileCard = ({ profile, onEdit, onShowLeaderboard, onShowVault }: ProfileCardProps) => {
  const { signOut } = useAuth();
  const { getClaimedBadges, getNextMilestone } = useStreakRewards();
  const { getUserPosts } = usePosts();
  const { bookmarks } = useBookmarks();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userResponses, setUserResponses] = useState<ChallengeResponse[]>([]);

  const badges = getClaimedBadges();
  const nextMilestone = getNextMilestone(profile.streak);

  useEffect(() => {
    const fetchUserContent = async () => {
      const posts = await getUserPosts(profile.user_id);
      setUserPosts(posts);

      const { data } = await supabase
        .from('challenge_responses')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) {
        setUserResponses(data as ChallengeResponse[]);
      }
    };

    fetchUserContent();
  }, [profile.user_id]);

  return (
    <div className="space-y-4 animate-scale-in">
      {/* Profile Header with custom gradient */}
      <div 
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${profile.color_primary || '#4ade80'}, ${profile.color_secondary || '#f472b6'})` 
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        <div className="relative flex justify-between mb-4">
          <Button variant="glass" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
          <Button variant="glass" size="icon" onClick={onEdit}>
            <Edit2 className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative flex flex-col items-center text-center">
          <img 
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.user_id}`} 
            alt={profile.display_name}
            className="w-24 h-24 rounded-3xl border-4 border-background mb-3 shadow-xl"
          />
          
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">{profile.display_name}</h2>
          <p className="text-white/80">@{profile.username}</p>
          
          {profile.vibe && (
            <span className="mt-2 px-4 py-1.5 rounded-full bg-background/30 backdrop-blur-sm text-white text-sm">
              {profile.vibe}
            </span>
          )}
        </div>
      </div>

      {/* Day Streak Counter with Badges */}
      <DayStreakCounter streak={profile.streak} size="md" />
      <StreakBadges streak={profile.streak} longestStreak={profile.longest_streak} size="md" />

      {/* Spotify */}
      <SpotifyConnect profile={profile} />

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-3">interests</p>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest, i) => (
              <span 
                key={i} 
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105"
                style={{ 
                  background: `linear-gradient(135deg, ${profile.color_primary || '#4ade80'}25, ${profile.color_secondary || '#f472b6'}25)`,
                  color: profile.color_primary || '#4ade80',
                  border: `1px solid ${profile.color_primary || '#4ade80'}40`
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vault Button */}
      <button 
        onClick={onShowVault}
        className="w-full glass rounded-2xl p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${profile.color_primary || '#4ade80'}40, ${profile.color_secondary || '#f472b6'}40)` }}
            >
              <Lock className="w-5 h-5" style={{ color: profile.color_primary || 'hsl(var(--primary))' }} />
            </div>
            <div>
              <p className="font-semibold flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Your Vault
              </p>
              <p className="text-sm text-muted-foreground">{bookmarks.length} saved posts</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </button>

      {/* Streak & Badges - Clickable for leaderboard */}
      <button 
        onClick={onShowLeaderboard}
        className="w-full glass rounded-2xl p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center animate-glow"
              style={{ background: `linear-gradient(135deg, ${profile.color_primary || '#4ade80'}, ${profile.color_secondary || '#f472b6'})` }}
            >
              <Flame className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold">{profile.streak}</p>
              <p className="text-sm text-muted-foreground">day streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nextMilestone && (
              <div className="text-right">
                <p className="text-2xl">{nextMilestone.reward}</p>
                <p className="text-xs text-muted-foreground">{nextMilestone.streak - profile.streak} to go</p>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">view leaderboard</span>
          </div>
          {badges.length > 0 && (
            <div className="flex gap-1">
              {badges.map((badge, i) => (
                <span key={i} className="text-xl">{badge.reward}</span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Bio */}
      {profile.bio && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">about</p>
          <p>{profile.bio}</p>
        </div>
      )}

      {/* Posts Grid */}
      {(userResponses.length > 0 || userPosts.length > 0) && (
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-3">posts</p>
          <div className="grid grid-cols-3 gap-2">
            {userResponses.slice(0, 6).map(response => (
              <div key={response.id} className="aspect-square rounded-xl overflow-hidden">
                <img 
                  src={response.back_photo_url} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {userPosts.slice(0, 6 - userResponses.length).map(post => (
              post.image_url && (
                <div key={post.id} className="aspect-square rounded-xl overflow-hidden">
                  <img 
                    src={post.image_url} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{profile.streak}</p>
          <p className="text-xs text-muted-foreground">current streak</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold">{profile.longest_streak}</p>
          <p className="text-xs text-muted-foreground">longest streak</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
