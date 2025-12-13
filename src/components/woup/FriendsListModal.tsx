import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, StarOff, UserMinus, Crown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FriendWithStatus extends Profile {
  is_top_friend?: boolean;
}

interface FriendsListModalProps {
  friends: FriendWithStatus[];
  onClose: () => void;
  onViewProfile: (friend: Profile) => void;
  onRefresh: () => void;
}

const FriendsListModal = ({ friends, onClose, onViewProfile, onRefresh }: FriendsListModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredFriends = friends.filter(friend => 
    friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topFriends = filteredFriends.filter(f => f.is_top_friend);
  const regularFriends = filteredFriends.filter(f => !f.is_top_friend);

  const handleUnfriend = async (friendId: string) => {
    if (!user) return;
    setLoading(friendId);

    // Delete both directions of friendship
    await supabase
      .from('friendships')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', friendId);

    await supabase
      .from('friendships')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', user.id);

    toast({ title: 'Friend removed 💔' });
    setLoading(null);
    onRefresh();
  };

  const handleToggleTopFriend = async (friendId: string, currentStatus: boolean) => {
    if (!user) return;
    setLoading(friendId);

    const { error } = await supabase
      .from('friendships')
      .update({ is_top_friend: !currentStatus })
      .eq('user_id', user.id)
      .eq('friend_id', friendId);

    if (!error) {
      toast({ 
        title: !currentStatus ? 'Added to top friends ⭐' : 'Removed from top friends'
      });
      onRefresh();
    }
    setLoading(null);
  };

  const FriendItem = ({ friend }: { friend: FriendWithStatus }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="glass rounded-2xl p-4 flex items-center gap-4"
    >
      <button 
        onClick={() => onViewProfile(friend)}
        className="flex items-center gap-4 flex-1 text-left"
      >
        <div className="relative">
          <img
            src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
            alt={friend.display_name}
            className="w-14 h-14 rounded-2xl object-cover"
            style={{
              border: friend.is_top_friend 
                ? `3px solid hsl(var(--neon-yellow))` 
                : '3px solid transparent'
            }}
          />
          {friend.is_top_friend && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-neon-yellow to-neon-orange flex items-center justify-center"
            >
              <Crown className="w-3 h-3 text-background" />
            </motion.div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{friend.display_name}</p>
          <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
          {friend.vibe && (
            <p className="text-xs text-primary mt-1">{friend.vibe}</p>
          )}
        </div>
      </button>

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleToggleTopFriend(friend.user_id, !!friend.is_top_friend)}
          disabled={loading === friend.user_id}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            friend.is_top_friend 
              ? 'bg-gradient-to-br from-neon-yellow to-neon-orange text-background' 
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          {friend.is_top_friend ? (
            <Star className="w-5 h-5 fill-current" />
          ) : (
            <StarOff className="w-5 h-5" />
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleUnfriend(friend.user_id)}
          disabled={loading === friend.user_id}
          className="w-10 h-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30 transition-colors"
        >
          <UserMinus className="w-5 h-5" />
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-md h-[85vh] glass rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-xl font-bold">Friends ({friends.length})</h2>
          <Button variant="glass" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-muted/50 border-0"
            />
          </div>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Top Friends Section */}
          {topFriends.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-neon-yellow" />
                <p className="text-sm font-semibold text-neon-yellow">Top Friends</p>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {topFriends.map(friend => (
                    <FriendItem key={friend.user_id} friend={friend} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* All Friends Section */}
          {regularFriends.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-3">All Friends</p>
              <div className="space-y-3">
                <AnimatePresence>
                  {regularFriends.map(friend => (
                    <FriendItem key={friend.user_id} friend={friend} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {filteredFriends.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery ? 'No friends found' : 'No friends yet'}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FriendsListModal;
