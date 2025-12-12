import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';

interface HeaderProps {
  onProfileClick: () => void;
  pendingCount: number;
}

const Header = ({ onProfileClick, pendingCount }: HeaderProps) => {
  const { profile } = useProfile();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gradient-primary">woup</h1>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
            <span className="text-lg">🔥</span>
            <span className="font-semibold text-primary">{profile?.streak || 0}</span>
          </div>
          
          <Button variant="glass" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-secondary text-xs font-bold flex items-center justify-center text-secondary-foreground">
                {pendingCount}
              </span>
            )}
          </Button>
          
          <Button variant="glass" size="icon" onClick={onProfileClick}>
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
