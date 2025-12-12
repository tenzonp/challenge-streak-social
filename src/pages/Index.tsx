import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Header from '@/components/woup/Header';
import BottomNav from '@/components/woup/BottomNav';
import ChallengeCard from '@/components/woup/ChallengeCard';
import FeedPost from '@/components/woup/FeedPost';
import FriendCard from '@/components/woup/FriendCard';
import ProfileCard from '@/components/woup/ProfileCard';
import SendChallengeModal from '@/components/woup/SendChallengeModal';
import CameraModal from '@/components/woup/CameraModal';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, Profile } from '@/hooks/useProfile';
import { useChallenges, Challenge } from '@/hooks/useChallenges';
import { useFeed } from '@/hooks/useFeed';
import { useFriends } from '@/hooks/useFriends';
import { Sparkles, Zap, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Tab = 'feed' | 'challenges' | 'friends' | 'profile';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { pendingChallenges, sendChallenge, respondToChallenge } = useChallenges();
  const { posts, addReaction } = useFeed();
  const { friends, allUsers, addFriend } = useFriends();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Loading state
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">loading your vibes...</p>
        </div>
      </div>
    );
  }

  const handleChallenge = (userId: string) => {
    const friend = [...friends, ...allUsers].find(f => f.user_id === userId);
    if (friend) setSelectedFriend(friend);
  };

  const handleRespond = (challengeId: string) => {
    const challenge = pendingChallenges.find(c => c.id === challengeId);
    if (challenge) setActiveChallenge(challenge as Challenge);
  };

  const handleSendChallenge = async (friendId: string, challengeText: string) => {
    return sendChallenge(friendId, challengeText);
  };

  const handleSubmitResponse = async (challengeId: string, frontUrl: string, backUrl: string, caption?: string) => {
    const { error } = await respondToChallenge(challengeId, frontUrl, backUrl, caption);
    if (error) {
      toast({
        title: "failed to post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddFriend = async (userId: string) => {
    const { error } = await addFriend(userId);
    if (!error) {
      toast({
        title: "friend added! 🎉",
        description: "you can now challenge them",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <Header 
        onProfileClick={() => setActiveTab('profile')} 
        pendingCount={pendingChallenges.length}
      />
      
      <main className="container mx-auto px-4">
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Pending Challenges Section */}
            {pendingChallenges.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-secondary" />
                  <h2 className="text-lg font-semibold">your challenges</h2>
                  <span className="px-2 py-0.5 rounded-full gradient-secondary text-xs font-bold text-secondary-foreground">
                    {pendingChallenges.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingChallenges.map(challenge => (
                    <ChallengeCard 
                      key={challenge.id} 
                      challenge={challenge}
                      onRespond={handleRespond}
                    />
                  ))}
                </div>
              </section>
            )}
            
            {/* Feed Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">latest woups</h2>
              </div>
              {posts.length === 0 ? (
                <div className="glass rounded-3xl p-8 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">no posts yet!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    send a challenge to get started 🚀
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map(post => (
                    <FeedPost 
                      key={post.id} 
                      post={post} 
                      onReact={addReaction}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        
        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-3xl gradient-secondary mx-auto mb-4 flex items-center justify-center animate-float">
                <Zap className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">send a challenge</h2>
              <p className="text-muted-foreground">pick a friend and ask them something!</p>
            </div>
            
            {friends.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">add friends first!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  go to the friends tab to find people
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map(friend => (
                  <FriendCard 
                    key={friend.id} 
                    friend={friend}
                    onChallenge={handleChallenge}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-6">
            {friends.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">your crew 👥</h2>
                <div className="space-y-3">
                  {friends.map(friend => (
                    <FriendCard 
                      key={friend.id} 
                      friend={friend}
                      onChallenge={handleChallenge}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-4">discover people ✨</h2>
              {allUsers.filter(u => !friends.some(f => f.user_id === u.user_id)).length === 0 ? (
                <div className="glass rounded-3xl p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">no one else here yet!</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    invite your friends to join woup 🚀
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers
                    .filter(u => !friends.some(f => f.user_id === u.user_id))
                    .map(user => (
                      <FriendCard 
                        key={user.id} 
                        friend={user}
                        onChallenge={handleChallenge}
                        showAddButton
                        onAdd={handleAddFriend}
                      />
                    ))}
                </div>
              )}
            </section>
          </div>
        )}
        
        {/* Profile Tab */}
        {activeTab === 'profile' && profile && (
          <ProfileCard profile={profile} />
        )}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Modals */}
      {selectedFriend && (
        <SendChallengeModal 
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onSend={handleSendChallenge}
        />
      )}
      
      {activeChallenge && (
        <CameraModal 
          challenge={activeChallenge}
          onClose={() => setActiveChallenge(null)}
          onSubmit={handleSubmitResponse}
        />
      )}
    </div>
  );
};

export default Index;
