import { Home, Zap, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'feed' | 'challenges' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onCreatePost: () => void;
}

const BottomNav = ({ activeTab, onTabChange, onCreatePost }: BottomNavProps) => {
  const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'challenges', icon: Zap, label: 'Friends' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between pb-safe">
        {/* Left tab */}
        <button
          onClick={() => onTabChange(tabs[0].id)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all duration-300",
            activeTab === tabs[0].id ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className={cn("w-6 h-6", activeTab === tabs[0].id && "text-primary")} />
          <span className="text-[10px] font-medium">{tabs[0].label}</span>
        </button>

        {/* Center create button */}
        <button 
          onClick={onCreatePost} 
          className="relative -mt-6"
        >
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center shadow-neon-green animate-glow">
            <Plus className="w-7 h-7 text-primary-foreground" />
          </div>
        </button>

        {/* Middle tab */}
        <button
          onClick={() => onTabChange(tabs[1].id)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all duration-300",
            activeTab === tabs[1].id ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className={cn("w-6 h-6", activeTab === tabs[1].id && "text-primary")} />
          <span className="text-[10px] font-medium">{tabs[1].label}</span>
        </button>

        {/* Right tab */}
        <button
          onClick={() => onTabChange(tabs[2].id)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all duration-300",
            activeTab === tabs[2].id ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className={cn("w-6 h-6", activeTab === tabs[2].id && "text-primary")} />
          <span className="text-[10px] font-medium">{tabs[2].label}</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
