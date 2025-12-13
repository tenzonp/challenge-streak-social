import { useState, useEffect } from 'react';
import { X, Flame, Music, Trophy, Zap, MessageCircle, UserPlus, Users, Clock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { usePosts, Post } from '@/hooks/usePosts';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import { ChallengeResponse } from '@/hooks/useChallenges';
import { useToast } from '@/hooks/use-toast';

interface UserProfileModalProps {
  user: Profile;
  onClose: () => void;
  onChat: (user: Profile) => void;
  onChallenge: (userId: string) => void;
}

const UserProfileModal = ({ user, onClose, onChat, onChallenge }: UserProfileModalProps) => {
  const { getUserPosts } = usePosts();
  const { sendFriendRequest, hasSentRequest, isFriend, cancelFriendRequest } = useFriends();
  const { toast } = useToast();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userResponses, setUserResponses] = useState<ChallengeResponse[]>([]);
  const [userFriendsCount, setUserFriendsCount] = useState(0);
  const [sending, setSending] = useState(false);
  
  const isAlreadyFriend = isFriend(user.user_id);
  const hasPendingRequest = hasSentRequest(user.user_id);

  useEffect(() => {
    const fetchUserContent = async () => {
      const posts = await getUserPosts(user.user_id);
      setUserPosts(posts);

      const { data } = await supabase
        .from('challenge_responses')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(9);

      if (data) {
        setUserResponses(data as ChallengeResponse[]);
      }

      // Fetch friends count
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('status', 'accepted');
      
      setUserFriendsCount(count || 0);
    };

    fetchUserContent();
  }, [user.user_id]);

  const handleSendRequest = async () => {
    setSending(true);
    const { error } = await sendFriendRequest(user.user_id);
    if (!error) toast({ title: 'Friend request sent! 📤' });
    setSending(false);
  };

  const handleCancelRequest = async () => {
    setSending(true);
    const { error } = await cancelFriendRequest(user.user_id);
    if (!error) toast({ title: 'Request cancelled' });
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md h-[85vh] glass rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header with gradient */}
        <div 
          className="relative h-40 overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${user.color_primary || '#4ade80'}, ${user.color_secondary || '#f472b6'})` 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          <Button 
            variant="glass" 
            size="icon" 
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Avatar */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <img 
              src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_id}`}
              alt={user.display_name}
              className="w-24 h-24 rounded-3xl border-4 border-background shadow-xl"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pt-14 px-4 pb-4">
          {/* Name & Username */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">{user.display_name}</h2>
            <p className="text-muted-foreground">@{user.username}</p>
            {user.vibe && (
              <span 
                className="inline-block mt-2 px-4 py-1 rounded-full text-sm"
                style={{ 
                  background: `${user.color_primary || '#4ade80'}20`,
                  color: user.color_primary || '#4ade80'
                }}
              >
                {user.vibe}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="glass rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{userFriendsCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">friends</p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-neon-orange" />
                <span className="text-2xl font-bold">{user.streak}</span>
              </div>
              <p className="text-xs text-muted-foreground">streak</p>
            </div>
            <div className="glass rounded-2xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-neon-yellow" />
                <span className="text-2xl font-bold">{user.longest_streak}</span>
              </div>
              <p className="text-xs text-muted-foreground">best</p>
            </div>
          </div>

          {/* Music */}
          {user.current_song && (
            <div 
              className="rounded-2xl p-4 mb-4 flex items-center gap-3"
              style={{ 
                background: `linear-gradient(135deg, ${user.color_primary || '#4ade80'}15, ${user.color_secondary || '#f472b6'}15)`,
                borderLeft: `3px solid ${user.color_primary || '#4ade80'}`
              }}
            >
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${user.color_primary || '#4ade80'}, ${user.color_secondary || '#f472b6'})` }}
              >
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">listening to</p>
                <p className="font-semibold truncate">{user.current_song}</p>
                <p className="text-sm text-muted-foreground truncate">{user.current_artist}</p>
              </div>
            </div>
          )}

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">interests</p>
              <div className="flex flex-wrap gap-2">
                {user.interests.map((interest, i) => (
                  <span 
                    key={i} 
                    className="px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ 
                      background: `linear-gradient(135deg, ${user.color_primary || '#4ade80'}20, ${user.color_secondary || '#f472b6'}20)`,
                      color: user.color_primary || '#4ade80',
                      border: `1px solid ${user.color_primary || '#4ade80'}30`
                    }}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && (
            <div className="glass rounded-2xl p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-1">about</p>
              <p>{user.bio}</p>
            </div>
          )}

          {/* Posts Grid */}
          {(userResponses.length > 0 || userPosts.length > 0) && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-3">posts</p>
              <div className="grid grid-cols-3 gap-2">
                {userResponses.slice(0, 9).map(response => (
                  <div key={response.id} className="aspect-square rounded-xl overflow-hidden">
                    <img 
                      src={response.back_photo_url} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                ))}
                {userPosts.slice(0, Math.max(0, 9 - userResponses.length)).map(post => (
                  post.image_url && (
                    <div key={post.id} className="aspect-square rounded-xl overflow-hidden">
                      <img 
                        src={post.image_url} 
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-border/50 flex gap-2">
          {!isAlreadyFriend && !hasPendingRequest && (
            <Button variant="outline" className="flex-1 gap-2" onClick={handleSendRequest} disabled={sending}>
              <UserPlus className="w-4 h-4" />
              add friend
            </Button>
          )}
          {!isAlreadyFriend && hasPendingRequest && (
            <Button variant="ghost" className="flex-1 gap-2 text-neon-yellow" onClick={handleCancelRequest} disabled={sending}>
              <Clock className="w-4 h-4" />
              pending
            </Button>
          )}
          {isAlreadyFriend && (
            <Button variant="ghost" className="flex-1 gap-2 text-neon-green" disabled>
              <Check className="w-4 h-4" />
              friends
            </Button>
          )}
          <Button variant="glass" className="flex-1 gap-2" onClick={() => onChat(user)}>
            <MessageCircle className="w-4 h-4" />
            message
          </Button>
          <Button variant="neon" className="flex-1 gap-2" onClick={() => onChallenge(user.user_id)}>
            <Zap className="w-4 h-4" />
            challenge
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;