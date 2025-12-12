import { Home, Zap, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'feed' | 'challenges' | 'friends' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: 'feed' as Tab, icon: Home, label: 'Feed' },
    { id: 'challenges' as Tab, icon: Zap, label: 'Challenges' },
    { id: 'friends' as Tab, icon: Users, label: 'Friends' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-around pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-4 rounded-2xl transition-all duration-300",
                isActive 
                  ? "text-primary shadow-neon-green" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive && "gradient-primary"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive && "text-primary-foreground"
                )} />
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
