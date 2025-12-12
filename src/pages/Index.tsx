import { useState } from 'react';
import Header from '@/components/woup/Header';
import BottomNav from '@/components/woup/BottomNav';
import ChallengeCard from '@/components/woup/ChallengeCard';
import FeedPost from '@/components/woup/FeedPost';
import FriendCard from '@/components/woup/FriendCard';
import ProfileCard from '@/components/woup/ProfileCard';
import SendChallengeModal from '@/components/woup/SendChallengeModal';
import CameraModal from '@/components/woup/CameraModal';
import { pendingChallenges, feedPosts, friends, currentUser } from '@/data/mockData';
import { User, Challenge } from '@/types/woup';
import { Sparkles, Zap } from 'lucide-react';

type Tab = 'feed' | 'challenges' | 'friends' | 'profile';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  const handleChallenge = (userId: string) => {
    const friend = friends.find(f => f.id === userId);
    if (friend) setSelectedFriend(friend);
  };

  const handleRespond = (challengeId: string) => {
    const challenge = pendingChallenges.find(c => c.id === challengeId);
    if (challenge) setActiveChallenge(challenge);
  };

  const handleSendChallenge = (friendId: string, challengeText: string) => {
    console.log('Challenge sent:', { friendId, challengeText });
  };

  const handleSubmitResponse = (challengeId: string) => {
    console.log('Response submitted:', challengeId);
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <Header onProfileClick={() => setActiveTab('profile')} />
      
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
              <div className="space-y-6">
                {feedPosts.map(post => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </div>
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
            
            <div className="space-y-3">
              {friends.map(friend => (
                <FriendCard 
                  key={friend.id} 
                  friend={friend}
                  onChallenge={handleChallenge}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">your crew 👥</h2>
            <div className="space-y-3">
              {friends.map(friend => (
                <FriendCard 
                  key={friend.id} 
                  friend={friend}
                  onChallenge={handleChallenge}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <ProfileCard user={currentUser} />
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
