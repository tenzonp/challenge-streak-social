import { Home, Zap, User, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticFeedback } from '@/utils/nativeApp';

type Tab = 'feed' | 'challenges' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onCreatePost: () => void;
  onSpinWheel: () => void;
}

const BottomNav = ({ activeTab, onTabChange, onCreatePost, onSpinWheel }: BottomNavProps) => {
  const handleTabChange = (tab: Tab) => {
    hapticFeedback('light');
    onTabChange(tab);
  };

  const handleCreate = () => {
    hapticFeedback('medium');
    onSpinWheel();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-safe bottom-nav">
      <div className="container mx-auto px-6 h-14 flex items-center justify-around">
        {/* Feed */}
        <button
          onClick={() => handleTabChange('feed')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-colors",
            activeTab === 'feed' ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Home className="w-6 h-6" strokeWidth={activeTab === 'feed' ? 2.5 : 1.5} />
        </button>

        {/* Search/Social */}
        <button
          onClick={() => handleTabChange('challenges')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-colors",
            activeTab === 'challenges' ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <Search className="w-6 h-6" strokeWidth={activeTab === 'challenges' ? 2.5 : 1.5} />
        </button>

        {/* Create */}
        <button
          onClick={handleCreate}
          className="flex items-center justify-center p-2 -mt-2"
        >
          <div className="w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
            <Plus className="w-6 h-6 text-background" strokeWidth={2} />
          </div>
        </button>

        {/* Activity */}
        <button
          onClick={() => handleTabChange('challenges')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-colors",
            "text-muted-foreground"
          )}
        >
          <Zap className="w-6 h-6" strokeWidth={1.5} />
        </button>

        {/* Profile */}
        <button
          onClick={() => handleTabChange('profile')}
          className={cn(
            "flex flex-col items-center gap-0.5 p-2 transition-colors",
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