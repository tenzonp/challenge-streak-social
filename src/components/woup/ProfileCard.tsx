import { Flame, Edit2, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

interface ProfileCardProps {
  profile: Profile;
}

const ProfileCard = ({ profile }: ProfileCardProps) => {
  const { signOut } = useAuth();

  return (
    <div className="glass rounded-3xl p-6 animate-scale-in">
      {/* Header with settings */}
      <div className="flex justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={signOut}>
          <LogOut className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Avatar & Info */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <img 
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.user_id}`} 
            alt={profile.display_name}
            className="w-24 h-24 rounded-3xl border-4 border-primary shadow-neon-green"
          />
          <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full gradient-secondary flex items-center justify-center shadow-neon-pink">
            <Edit2 className="w-4 h-4 text-secondary-foreground" />
          </button>
        </div>
        
        <h2 className="text-2xl font-bold mb-1">{profile.display_name}</h2>
        <p className="text-muted-foreground mb-2">@{profile.username}</p>
        
        {profile.vibe && (
          <span className="px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm">
            {profile.vibe}
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
            <p className="text-4xl font-bold text-gradient-primary">{profile.streak}</p>
            <p className="text-sm text-muted-foreground">day streak 🔥</p>
          </div>
        </div>
      </div>
      
      {/* Bio */}
      {profile.bio && (
        <div className="text-center">
          <p className="text-muted-foreground">{profile.bio}</p>
        </div>
      )}
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
        <div className="text-center">
          <p className="text-2xl font-bold">{profile.streak}</p>
          <p className="text-xs text-muted-foreground">current streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{profile.longest_streak}</p>
          <p className="text-xs text-muted-foreground">longest streak</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
