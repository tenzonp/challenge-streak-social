import { Flame, Edit2, Settings } from 'lucide-react';
import { User } from '@/types/woup';
import { Button } from '@/components/ui/button';

interface ProfileCardProps {
  user: User;
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  return (
    <div className="glass rounded-3xl p-6 animate-scale-in">
      {/* Header with settings */}
      <div className="flex justify-end mb-4">
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Avatar & Info */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <img 
            src={user.avatar} 
            alt={user.displayName}
            className="w-24 h-24 rounded-3xl border-4 border-primary shadow-neon-green"
          />
          <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full gradient-secondary flex items-center justify-center shadow-neon-pink">
            <Edit2 className="w-4 h-4 text-secondary-foreground" />
          </button>
        </div>
        
        <h2 className="text-2xl font-bold mb-1">{user.displayName}</h2>
        <p className="text-muted-foreground mb-2">@{user.username}</p>
        
        {user.vibe && (
          <span className="px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm">
            {user.vibe}
          </span>
        )}
      </div>
      
      {/* Streak showcase */}
      <div className="gradient-card rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center animate-glow">
            <Flame className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-4xl font-bold text-gradient-primary">{user.streak}</p>
            <p className="text-sm text-muted-foreground">day streak 🔥</p>
          </div>
        </div>
      </div>
      
      {/* Bio */}
      {user.bio && (
        <div className="text-center">
          <p className="text-muted-foreground">{user.bio}</p>
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
        <div className="text-center">
          <p className="text-2xl font-bold">24</p>
          <p className="text-xs text-muted-foreground">challenges</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">18</p>
          <p className="text-xs text-muted-foreground">completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">12</p>
          <p className="text-xs text-muted-foreground">friends</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
