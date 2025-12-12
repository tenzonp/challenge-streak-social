import { Home, Zap, User, MessageCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'feed' | 'challenges' | 'messages' | 'friends' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadMessages?: number;
  onCreatePost: () => void;
}

const BottomNav = ({ activeTab, onTabChange, unreadMessages = 0, onCreatePost }: BottomNavProps) => {
  const tabs: { id: Tab | 'create'; icon: any; label: string; badge?: number }[] = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'challenges', icon: Zap, label: 'Challenge' },
    { id: 'messages', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-around pb-safe">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as Tab)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("p-2 rounded-xl transition-all duration-300", isActive && "gradient-primary")}>
                <Icon className={cn("w-5 h-5 transition-colors", isActive && "text-primary-foreground")} />
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}

        {/* Create button */}
        <button onClick={onCreatePost} className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-neon-green -mt-6">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
        </button>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as Tab)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all duration-300 relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn("p-2 rounded-xl transition-all duration-300 relative", isActive && "gradient-primary")}>
                <Icon className={cn("w-5 h-5 transition-colors", isActive && "text-primary-foreground")} />
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-secondary text-[10px] font-bold flex items-center justify-center text-secondary-foreground">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
