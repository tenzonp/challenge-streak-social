import { useState, useCallback } from 'react';
import { ArrowLeft, MessageCircle, Search, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useMessages } from '@/hooks/useMessages';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useToast } from '@/hooks/use-toast';

interface ChatsListProps {
  onSelectChat: (friend: Profile) => void;
  onClose: () => void;
}

const ChatsList = ({ onSelectChat, onClose }: ChatsListProps) => {
  const { conversations, loading, refetch } = useMessages();
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const handleRefresh = useCallback(async () => {
    await refetch?.();
    toast({ title: 'Refreshed' });
  }, [refetch, toast]);

  const { pullDistance, refreshing, handlers } = usePullToRefresh({ onRefresh: handleRefresh });

  const filteredConversations = conversations.filter(conv => 
    conv.friend.display_name.toLowerCase().includes(search.toLowerCase()) ||
    conv.friend.username.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m`;
    }
    if (hours < 24) return `${hours}h`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
      {...handlers}
    >
      {/* Pull to refresh indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center z-40 pointer-events-none safe-top"
        animate={{ 
          y: pullDistance > 0 ? pullDistance - 40 : -40,
          opacity: pullDistance > 30 ? 1 : 0 
        }}
      >
        <div className="bg-primary/20 backdrop-blur-sm rounded-full p-2 mt-2">
          <RefreshCw 
            className={`w-5 h-5 text-primary ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullDistance * 3}deg)` }}
          />
        </div>
      </motion.div>

      {/* Header */}
      <div className="border-b border-border/30 p-4 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">Messages</h1>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl bg-muted/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-3xl gradient-primary mx-auto mb-4 flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h3 className="font-bold text-lg mb-2">
              {search ? 'No results found' : 'No messages yet'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {search ? 'Try a different search' : 'Start a conversation with friends! ✨'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            <AnimatePresence>
              {filteredConversations.map((conv, index) => (
                <motion.button
                  key={conv.friend.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectChat(conv.friend)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                >
                  {/* Avatar */}
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

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-semibold ${conv.unreadCount > 0 ? '' : 'text-muted-foreground'}`}>
                        {conv.friend.display_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conv.lastMessage && formatTime(conv.lastMessage.created_at)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {conv.unreadCount > 0 && (
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: conv.friend.color_primary || 'hsl(var(--primary))' }}
                    />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatsList;