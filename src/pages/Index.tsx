import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from '@/components/woup/Header';
import BottomNav from '@/components/woup/BottomNav';
import ChallengeCard from '@/components/woup/ChallengeCard';
import ViralPostCard from '@/components/woup/ViralPostCard';
import FriendCard from '@/components/woup/FriendCard';
import ProfileCard from '@/components/woup/ProfileCard';
import SendChallengeModal from '@/components/woup/SendChallengeModal';
import CameraModal from '@/components/woup/CameraModal';
import ProfileEditModal from '@/components/woup/ProfileEditModal';
import ChatView from '@/components/woup/ChatView';
import ChatsList from '@/components/woup/ChatsList';
import UserSearch from '@/components/woup/UserSearch';
import CreatePostModal from '@/components/woup/CreatePostModal';
import RewardAnimation from '@/components/woup/RewardAnimation';
import UserProfileModal from '@/components/woup/UserProfileModal';
import StreakLeaderboard from '@/components/woup/StreakLeaderboard';
import CompetitionCard from '@/components/woup/CompetitionCard';
import VideoCallModal from '@/components/woup/VideoCallModal';
import BookmarksVault from '@/components/woup/BookmarksVault';
import OnboardingFlow from '@/components/woup/OnboardingFlow';
import FriendsListModal from '@/components/woup/FriendsListModal';
import FriendRequestsModal from '@/components/woup/FriendRequestsModal';
import { AchievementUnlockModal } from '@/components/woup/AchievementBadge';
import { DayStreakCounter } from '@/components/woup/StreakBadges';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, Profile } from '@/hooks/useProfile';
import { useChallenges, Challenge } from '@/hooks/useChallenges';
import { useAIFeed } from '@/hooks/useAIFeed';
import { useFriends } from '@/hooks/useFriends';
import { useMessages } from '@/hooks/useMessages';
import { useChallengeExpiry } from '@/hooks/useChallengeExpiry';
import { useStreakRewards } from '@/hooks/useStreakRewards';
import { useCompetitions } from '@/hooks/useCompetitions';
import { useAchievements } from '@/hooks/useAchievements';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Zap, MessageCircle, Loader2, Search, Users, Globe, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

type Tab = 'feed' | 'challenges' | 'profile';
type FeedTab = 'friends' | 'global';

interface LocationState {
  openChatWith?: string;
  activeTab?: Tab;
  highlightChallenge?: string;
  viewProfile?: string;
}

const Index = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { pendingChallenges, sendChallenge, respondToChallenge } = useChallenges();
  const [feedTab, setFeedTab] = useState<FeedTab>('friends');
  const { posts, addReaction, markAsViewed, loading: feedLoading } = useAIFeed(feedTab);
  const { 
    friends, 
    topFriends, 
    pendingRequests, 
    allUsers, 
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    hasSentRequest,
    isFriend: checkIsFriend,
    refetch: refetchFriends 
  } = useFriends();
  const { conversations } = useMessages();
  const { showReward, setShowReward, checkAndClaimReward } = useStreakRewards();
  const { activeCompetitions, leaderboard, userEntry, joinCompetition } = useCompetitions();
  const { newAchievement, setNewAchievement } = useAchievements();
  useChallengeExpiry();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [chatWith, setChatWith] = useState<Profile | null>(null);
  const [showChatsList, setShowChatsList] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [videoCallWith, setVideoCallWith] = useState<Profile | null>(null);
  const [showVault, setShowVault] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    if (profile && !profile.has_completed_onboarding) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const handleCompleteOnboarding = async () => {
    setShowOnboarding(false);
    await updateProfile({ has_completed_onboarding: true });
  };

  // Handle navigation state from notifications
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state) return;

    // Open chat with specific user
    if (state.openChatWith) {
      const chatFriend = [...friends, ...allUsers].find(f => f.user_id === state.openChatWith);
      if (chatFriend) {
        setChatWith(chatFriend);
      }
    }

    // Switch to specific tab
    if (state.activeTab) {
      setActiveTab(state.activeTab);
    }

    // View a specific profile
    if (state.viewProfile) {
      const profileUser = [...friends, ...allUsers].find(f => f.user_id === state.viewProfile);
      if (profileUser) {
        setViewingProfile(profileUser);
      }
    }

    // Clear state after handling
    window.history.replaceState({}, document.title);
  }, [location.state, friends, allUsers]);

  const unreadCount = conversations?.reduce((acc, c) => acc + c.unreadCount, 0) || 0;

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

  const handleSendFriendRequest = async (userId: string) => {
    const { error } = await sendFriendRequest(userId);
    if (!error) toast({ title: 'Friend request sent! 📤' });
  };

  const handleTabChange = (tab: Tab) => setActiveTab(tab);

  const handleViewProfile = (user: Profile) => {
    setViewingProfile(user);
  };

  const handleChatFromProfile = (user: Profile) => {
    setViewingProfile(null);
    setChatWith(user);
  };

  const handleChallengeFromProfile = (userId: string) => {
    setViewingProfile(null);
    handleChallenge(userId);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-20">
      <Header 
        onProfileClick={() => setActiveTab('profile')} 
        pendingCount={pendingChallenges.length}
        unreadMessages={unreadCount}
        friendRequestsCount={pendingRequests.length}
        onMessagesClick={() => setShowChatsList(true)}
        onFriendRequestsClick={() => setShowFriendRequests(true)}
      />
      
      <main className="container mx-auto px-4">
        {activeTab === 'feed' && (
          <div className="space-y-6">
            {/* Feed Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFeedTab('friends')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  feedTab === 'friends' 
                    ? 'gradient-primary text-primary-foreground shadow-neon-green' 
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" /> Friends
              </button>
              <button
                onClick={() => setFeedTab('global')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  feedTab === 'global' 
                    ? 'gradient-accent text-accent-foreground shadow-neon-cyan' 
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-4 h-4" /> Global
              </button>
            </div>

            {/* Competitions */}
            {activeCompetitions.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-neon-yellow" />
                  <h2 className="font-bold text-lg">🏆 Active Competition</h2>
                </div>
                <CompetitionCard 
                  competition={activeCompetitions[0]}
                  leaderboard={leaderboard}
                  userEntry={userEntry}
                  onJoin={() => joinCompetition(activeCompetitions[0].id)}
                  onViewProfile={handleViewProfile}
                />
              </section>
            )}

            {/* HIGHLIGHTED: Pending Challenges */}
            {pendingChallenges.length > 0 && (
              <section className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-neon-pink" />
                  <h2 className="text-xl font-black text-gradient-challenge">⚡ challenges waiting!</h2>
                  <span className="px-3 py-1 rounded-full gradient-challenge text-xs font-black text-primary-foreground animate-bounce">
                    {pendingChallenges.length} NEW
                  </span>
                </div>
                <div className="space-y-4">
                  {pendingChallenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} onRespond={handleRespond} />
                  ))}
                </div>
              </section>
            )}
            
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-neon-cyan" />
                <h2 className="text-lg font-bold">{feedTab === 'friends' ? '✨ friends feed' : '🌍 global feed'}</h2>
              </div>
              {posts.length === 0 ? (
                <div className="glass-strong rounded-3xl p-8 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">no posts yet! be the first 🚀</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map((post, i) => (
                    <ViralPostCard 
                      key={post.id} 
                      post={post} 
                      onReact={addReaction} 
                      onViewProfile={handleViewProfile}
                      onView={markAsViewed}
                      isNew={i < 3}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        
        {activeTab === 'challenges' && (
          <div className="space-y-6">
            {/* Messages section */}
            {conversations.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-secondary" />
                    <h2 className="font-semibold">messages</h2>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full gradient-secondary text-xs font-bold text-secondary-foreground">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                  {conversations.map(conv => (
                    <button
                      key={conv.friend.user_id}
                      onClick={() => setChatWith(conv.friend)}
                      className="flex flex-col items-center gap-1 shrink-0"
                    >
                      <div className="relative">
                        <img 
                          src={conv.friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.friend.user_id}`} 
                          className="w-14 h-14 rounded-2xl"
                          style={{ 
                            borderColor: conv.friend.color_primary || 'transparent',
                            borderWidth: conv.friend.color_primary ? 2 : 0
                          }}
                        />
                        {conv.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-secondary text-[10px] font-bold flex items-center justify-center text-secondary-foreground">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate max-w-14">{conv.friend.display_name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Friends section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">friends</h2>
                </div>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowSearch(true)}>
                  <Search className="w-4 h-4" /> find
                </Button>
              </div>
              
              {friends.length === 0 ? (
                <div className="glass rounded-3xl p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">no friends yet</p>
                  <Button variant="neon" onClick={() => setShowSearch(true)}>find friends</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {friends.map(friend => (
                    <FriendCard 
                      key={friend.id} 
                      friend={friend} 
                      onChallenge={handleChallenge} 
                      onChat={setChatWith}
                      onViewProfile={handleViewProfile}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Discover section */}
            {allUsers.filter(u => !friends.some(f => f.user_id === u.user_id)).length > 0 && (
              <section>
                <h2 className="font-semibold mb-4">discover ✨</h2>
                <div className="space-y-3">
                  {allUsers.filter(u => !friends.some(f => f.user_id === u.user_id)).slice(0, 5).map(user => (
                    <FriendCard 
                      key={user.id} 
                      friend={user} 
                      onChallenge={handleChallenge} 
                      onViewProfile={handleViewProfile}
                      showAddButton 
                      onAdd={handleSendFriendRequest} 
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
        
        {activeTab === 'profile' && profile && (
          <ProfileCard 
            profile={profile} 
            onEdit={() => setShowProfileEdit(true)} 
            onShowLeaderboard={() => setShowLeaderboard(true)}
            onShowVault={() => setShowVault(true)}
            onShowFriends={() => setShowFriendsList(true)}
            onViewUserProfile={handleViewProfile}
          />
        )}
      </main>
      
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} onCreatePost={() => setShowCreatePost(true)} />
      
      {selectedFriend && <SendChallengeModal friend={selectedFriend} onClose={() => setSelectedFriend(null)} onSend={handleSendChallenge} />}
      {activeChallenge && <CameraModal challenge={activeChallenge} onClose={() => setActiveChallenge(null)} onSubmit={handleSubmitResponse} />}
      {showProfileEdit && profile && <ProfileEditModal profile={profile} onClose={() => setShowProfileEdit(false)} />}
      {showChatsList && (
        <ChatsList 
          onSelectChat={(friend) => { setShowChatsList(false); setChatWith(friend); }}
          onClose={() => setShowChatsList(false)}
        />
      )}
      {chatWith && <ChatView friend={chatWith} onBack={() => setChatWith(null)} onViewProfile={handleViewProfile} onVideoCall={setVideoCallWith} />}
      {showSearch && <UserSearch onChallenge={handleChallenge} onChat={setChatWith} onClose={() => setShowSearch(false)} />}
      {showCreatePost && <CreatePostModal onClose={() => setShowCreatePost(false)} />}
      {showReward && <RewardAnimation reward={showReward} onComplete={() => setShowReward(null)} />}
      {viewingProfile && (
        <UserProfileModal 
          user={viewingProfile} 
          onClose={() => setViewingProfile(null)} 
          onChat={handleChatFromProfile}
          onChallenge={handleChallengeFromProfile}
        />
      )}
      {showLeaderboard && (
        <StreakLeaderboard onClose={() => setShowLeaderboard(false)} onViewProfile={handleViewProfile} />
      )}
      {videoCallWith && <VideoCallModal friend={videoCallWith} onClose={() => setVideoCallWith(null)} />}
      {newAchievement && <AchievementUnlockModal achievement={newAchievement} onClose={() => setNewAchievement(null)} />}
      {showVault && <BookmarksVault onClose={() => setShowVault(false)} />}
      
      {/* Onboarding Flow */}
      <AnimatePresence>
        {showOnboarding && <OnboardingFlow onComplete={handleCompleteOnboarding} />}
      </AnimatePresence>
      
      {/* Friends List Modal */}
      {showFriendsList && (
        <FriendsListModal 
          friends={friends} 
          onClose={() => setShowFriendsList(false)} 
          onViewProfile={(friend) => { setShowFriendsList(false); handleViewProfile(friend); }}
          onRefresh={refetchFriends}
        />
      )}
      
      {/* Friend Requests Modal */}
      {showFriendRequests && (
        <FriendRequestsModal 
          requests={pendingRequests}
          onClose={() => setShowFriendRequests(false)}
          onAccept={acceptFriendRequest}
          onDecline={declineFriendRequest}
          onViewProfile={(user) => { setShowFriendRequests(false); handleViewProfile(user); }}
        />
      )}
    </div>
  );
};

export default Index;
