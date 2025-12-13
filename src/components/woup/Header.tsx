import { Bell, User, MessageCircle, Flame, Zap, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  onProfileClick: () => void;
  pendingCount: number;
  unreadMessages?: number;
  friendRequestsCount?: number;
  onMessagesClick?: () => void;
  onFriendRequestsClick?: () => void;
}

const Header = ({ onProfileClick, pendingCount, unreadMessages = 0, friendRequestsCount = 0, onMessagesClick, onFriendRequestsClick }: HeaderProps) => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-border/30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <motion.h1 
          className="text-2xl font-black text-gradient-primary tracking-tight"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          woup
        </motion.h1>
        
        <div className="flex items-center gap-2">
          {/* Streak Counter with Dopamine Animation */}
          <motion.div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-neon-orange/20 to-neon-yellow/20 border border-neon-orange/30 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.span 
              className="text-lg"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              🔥
            </motion.span>
            <span className="font-black text-neon-orange">{profile?.streak || 0}</span>
            <span className="text-xs text-muted-foreground font-medium">day{(profile?.streak || 0) !== 1 ? 's' : ''}</span>
          </motion.div>
          
          {/* Friend Requests */}
          {onFriendRequestsClick && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="glass" size="icon" className="relative" onClick={onFriendRequestsClick}>
                <UserPlus className={friendRequestsCount > 0 ? "w-5 h-5 text-neon-green" : "w-5 h-5"} />
                <AnimatePresence>
                  {friendRequestsCount > 0 && (
                    <>
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-xs font-bold flex items-center justify-center text-primary-foreground"
                      >
                        {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
                      </motion.span>
                      <motion.span 
                        className="absolute inset-0 rounded-xl border-2 border-neon-green"
                        animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    </>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          )}
          
          {/* Messages */}
          {onMessagesClick && (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button variant="glass" size="icon" className="relative" onClick={onMessagesClick}>
                <MessageCircle className="w-5 h-5" />
                <AnimatePresence>
                  {unreadMessages > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-xs font-bold flex items-center justify-center text-primary-foreground"
                    >
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          )}
          
          {/* Challenges/Notifications with pulse when pending */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button 
              variant="glass" 
              size="icon" 
              className="relative"
              onClick={() => navigate('/notifications')}
            >
              <Zap className={pendingCount > 0 ? "w-5 h-5 text-neon-pink" : "w-5 h-5"} />
              <AnimatePresence>
                {pendingCount > 0 && (
                  <>
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-challenge text-xs font-bold flex items-center justify-center text-primary-foreground"
                    >
                      {pendingCount}
                    </motion.span>
                    <motion.span 
                      className="absolute inset-0 rounded-xl border-2 border-neon-pink"
                      animate={{ scale: [1, 1.3], opacity: [1, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
          
          {/* Profile */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="glass" size="icon" onClick={onProfileClick}>
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  className="w-7 h-7 rounded-lg"
                  style={{ 
                    borderColor: profile.color_primary || 'hsl(var(--primary))', 
                    borderWidth: 2 
                  }}
                />
              ) : (
                <User className="w-5 h-5" />
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Header;
