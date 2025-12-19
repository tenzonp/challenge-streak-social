import { Bell, User, MessageCircle, Zap, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onProfileClick: () => void;
  pendingCount: number;
  unreadMessages?: number;
  friendRequestsCount?: number;
  onMessagesClick?: () => void;
  onFriendRequestsClick?: () => void;
}

const Header = ({
  onProfileClick,
  pendingCount,
  unreadMessages = 0,
  friendRequestsCount = 0,
  onMessagesClick,
  onFriendRequestsClick,
}: HeaderProps) => {
  const { profile } = useProfile();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border pt-safe">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">woup</h1>

        <div className="flex items-center gap-1">
          {/* Streak Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm">
            <span>🔥</span>
            <span className="font-semibold">{profile?.streak || 0}</span>
          </div>

          {/* Friend Requests */}
          {onFriendRequestsClick && (
            <Button variant="ghost" size="icon" className="relative" onClick={onFriendRequestsClick}>
              <UserPlus className="w-5 h-5" />
              {friendRequestsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-red text-[10px] font-bold flex items-center justify-center text-white">
                  {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
                </span>
              )}
            </Button>
          )}

          {/* Messages */}
          {onMessagesClick && (
            <Button variant="ghost" size="icon" className="relative" onClick={onMessagesClick}>
              <MessageCircle className="w-5 h-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-blue text-[10px] font-bold flex items-center justify-center text-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Button>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
            <Zap className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent-red text-[10px] font-bold flex items-center justify-center text-white">
                {pendingCount}
              </span>
            )}
          </Button>

          {/* Profile */}
          <Button variant="ghost" size="icon" onClick={onProfileClick}>
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'Profile'}
                loading="lazy"
                decoding="async"
                className="w-7 h-7 rounded-full object-cover"
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