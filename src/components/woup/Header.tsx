import { Bell, User, MessageCircle, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface HeaderProps {
  onProfileClick: () => void;
  pendingCount: number;
  unreadMessages?: number;
  onMessagesClick?: () => void;
}

const Header = ({ onProfileClick, pendingCount, unreadMessages = 0, onMessagesClick }: HeaderProps) => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gradient-primary">woup</h1>
        
        <div className="flex items-center gap-2">
          {/* Streak Counter with Animation */}
          <motion.div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            <motion.span 
              className="text-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              🔥
            </motion.span>
            <span className="font-bold text-primary">{profile?.streak || 0}</span>
            <span className="text-xs text-muted-foreground">days</span>
          </motion.div>
          
          {/* Messages */}
          {onMessagesClick && (
            <Button variant="glass" size="icon" className="relative" onClick={onMessagesClick}>
              <MessageCircle className="w-5 h-5" />
              {unreadMessages > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-xs font-bold flex items-center justify-center text-primary-foreground"
                >
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </motion.span>
              )}
            </Button>
          )}
          
          {/* Notifications - Now navigates to settings */}
          <Button 
            variant="glass" 
            size="icon" 
            className="relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-secondary text-xs font-bold flex items-center justify-center text-secondary-foreground"
              >
                {pendingCount}
              </motion.span>
            )}
          </Button>
          
          {/* Profile */}
          <Button variant="glass" size="icon" onClick={onProfileClick}>
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                className="w-7 h-7 rounded-lg"
                style={{ borderColor: profile.color_primary || undefined, borderWidth: profile.color_primary ? 1 : 0 }}
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
