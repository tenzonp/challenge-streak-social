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
import ProfileEditModal from '@/components/woup/ProfileEditModal';
import ChatView from '@/components/woup/ChatView';
import UserSearch from '@/components/woup/UserSearch';
import CreatePostModal from '@/components/woup/CreatePostModal';
import RewardAnimation from '@/components/woup/RewardAnimation';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, Profile } from '@/hooks/useProfile';
import { useChallenges, Challenge } from '@/hooks/useChallenges';
import { useFeed } from '@/hooks/useFeed';
import { useFriends } from '@/hooks/useFriends';
import { useMessages } from '@/hooks/useMessages';
import { useStreakRewards } from '@/hooks/useStreakRewards';
import { Sparkles, Zap, Users, Loader2, Search, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

type Tab = 'feed' | 'challenges' | 'messages' | 'friends' | 'profile';

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { pendingChallenges, sendChallenge, respondToChallenge } = useChallenges();
  const { posts, addReaction } = useFeed();
  const { friends, allUsers, addFriend } = useFriends();
  const { conversations } = useMessages();
  const { showReward, setShowReward, checkAndClaimReward } = useStreakRewards();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [chatWith, setChatWith] = useState<Profile | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const unreadCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

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
    if (!error && profile) {
      checkAndClaimReward(profile.streak + 1);
    }
  };

  const handleAddFriend = async (userId: string) => {
    const { error } = await addFriend(userId);
    if (!error) toast({ title: 'friend added! 🎉' });
  };

  const handleTabChange = (tab: Tab) => setActiveTab(tab);

  return (
    <div className="min-h-screen bg-background pb-24 pt-20">
      <Header onProfileClick={() => setActiveTab('profile')} pendingCount={pendingChallenges.length} />
      
      <main className="container mx-auto px-4">
        {activeTab === 'feed' && (
          <div className="space-y-6">
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
                    <ChallengeCard key={challenge.id} challenge={challenge} onRespond={handleRespond} />
                  ))}
                </div>
              </section>
            )}
            
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">latest woups</h2>
              </div>
              {posts.length === 0 ? (
                <div className="glass rounded-3xl p-8 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">no posts yet!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map(post => (
                    <FeedPost key={post.id} post={post} onReact={addReaction} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-3xl gradient-secondary mx-auto mb-4 flex items-center justify-center animate-float">
                <Zap className="w-10 h-10 text-secondary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">send a challenge</h2>
              <p className="text-muted-foreground">pick a friend!</p>
            </div>
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowSearch(true)}>
              <Search className="w-4 h-4" /> find users
            </Button>
            <div className="space-y-3">
              {friends.map(friend => (
                <FriendCard key={friend.id} friend={friend} onChallenge={handleChallenge} onChat={setChatWith} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">messages 💬</h2>
            </div>
            {conversations.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">no messages yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map(conv => (
                  <button
                    key={conv.friend.user_id}
                    onClick={() => setChatWith(conv.friend)}
                    className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <img src={conv.friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.friend.user_id}`} className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{conv.friend.display_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage?.content}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="w-6 h-6 rounded-full gradient-secondary text-xs font-bold flex items-center justify-center text-secondary-foreground">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'friends' && (
          <div className="space-y-6">
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowSearch(true)}>
              <Search className="w-4 h-4" /> find friends
            </Button>
            {friends.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">your crew 👥</h2>
                <div className="space-y-3">
                  {friends.map(friend => (
                    <FriendCard key={friend.id} friend={friend} onChallenge={handleChallenge} onChat={setChatWith} />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="text-xl font-bold mb-4">discover ✨</h2>
              <div className="space-y-3">
                {allUsers.filter(u => !friends.some(f => f.user_id === u.user_id)).map(user => (
                  <FriendCard key={user.id} friend={user} onChallenge={handleChallenge} showAddButton onAdd={handleAddFriend} />
                ))}
              </div>
            </section>
          </div>
        )}
        
        {activeTab === 'profile' && profile && (
          <ProfileCard profile={profile} onEdit={() => setShowProfileEdit(true)} />
        )}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} unreadMessages={unreadCount} onCreatePost={() => setShowCreatePost(true)} />
      
      {selectedFriend && <SendChallengeModal friend={selectedFriend} onClose={() => setSelectedFriend(null)} onSend={handleSendChallenge} />}
      {activeChallenge && <CameraModal challenge={activeChallenge} onClose={() => setActiveChallenge(null)} onSubmit={handleSubmitResponse} />}
      {showProfileEdit && profile && <ProfileEditModal profile={profile} onClose={() => setShowProfileEdit(false)} />}
      {chatWith && <ChatView friend={chatWith} onBack={() => setChatWith(null)} />}
      {showSearch && <UserSearch onChallenge={handleChallenge} onChat={setChatWith} onClose={() => setShowSearch(false)} />}
      {showCreatePost && <CreatePostModal onClose={() => setShowCreatePost(false)} />}
      {showReward && <RewardAnimation reward={showReward} onComplete={() => setShowReward(null)} />}
    </div>
  );
};

export default Index;
