import { useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticFeedback } from '@/utils/nativeApp';

type Tab = 'feed' | 'challenges' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onCreatePost: () => void;
  onSpinWheel: () => void;
  pendingCount?: number;
}

const BottomNav = ({ activeTab, onTabChange, onCreatePost, onSpinWheel, pendingCount = 0 }: BottomNavProps) => {
  const navigate = useNavigate();

  const handleTabChange = (tab: Tab) => {
    hapticFeedback('light');
    onTabChange(tab);
  };

  const handleCreate = () => {
    hapticFeedback('medium');
    onSpinWheel();
  };

  const handleNotifications = () => {
    hapticFeedback('light');
    navigate('/notifications');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe bottom-nav">
      <div className="container mx-auto px-6 h-14 flex items-center justify-around">
        {/* Feed */}
        <button
          onClick={() => handleTabChange('feed')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-all active:scale-90",
            activeTab === 'feed' ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Home className="w-6 h-6" strokeWidth={activeTab === 'feed' ? 2.5 : 1.5} />
        </button>

        {/* Search/Social */}
        <button
          onClick={() => handleTabChange('challenges')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-all active:scale-90",
            activeTab === 'challenges' ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Search className="w-6 h-6" strokeWidth={activeTab === 'challenges' ? 2.5 : 1.5} />
        </button>

        {/* Create */}
        <button
          onClick={handleCreate}
          className="flex items-center justify-center p-2 -mt-2 active:scale-90 transition-transform"
        >
          <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
            <Plus className="w-6 h-6 text-background" strokeWidth={2} />
          </div>
        </button>

        {/* Notifications */}
        <button
          onClick={handleNotifications}
          className="flex flex-col items-center gap-0.5 p-2 transition-all active:scale-90 relative text-muted-foreground"
        >
          <Bell className="w-6 h-6" strokeWidth={1.5} />
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => handleTabChange('profile')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-all active:scale-90",
            activeTab === 'profile' ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <User className="w-6 h-6" strokeWidth={activeTab === 'profile' ? 2.5 : 1.5} />
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;