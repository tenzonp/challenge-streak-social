import { useState, useEffect } from 'react';
import { Clock, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Profile } from '@/hooks/useProfile';

interface ChallengeCardProps {
  challenge: {
    id: string;
    challenge_text: string;
    created_at: string;
    expires_at: string;
    status: string;
    from_user?: Profile;
  };
  onRespond: (challengeId: string) => void;
  onDismiss?: (challengeId: string) => void;
}

const ChallengeCard = ({ challenge, onRespond, onDismiss }: ChallengeCardProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const expiresAt = new Date(challenge.expires_at);
      const createdAt = new Date(challenge.created_at);
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('expired');
        setProgress(0);
        return;
      }
      
      const totalDuration = expiresAt.getTime() - createdAt.getTime();
      const elapsed = now.getTime() - createdAt.getTime();
      setProgress(Math.max(0, ((totalDuration - elapsed) / totalDuration) * 100));
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [challenge]);

  const isUrgent = progress < 30;
  const isCritical = progress < 15;
  
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 transition-all duration-300",
        "border bg-card",
        isCritical 
          ? "border-destructive/50" 
          : isUrgent 
            ? "border-muted-foreground/30" 
            : "border-border"
      )}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
        <div 
          className={cn(
            "h-full transition-all duration-1000",
            isCritical ? "bg-destructive" : isUrgent ? "bg-muted-foreground" : "bg-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-start gap-3">
        <img 
          src={challenge.from_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`} 
          alt={challenge.from_user?.display_name || 'User'}
          className="w-10 h-10 rounded-xl border border-border"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{challenge.from_user?.display_name || 'Friend'}</span>
            <span className="text-muted-foreground text-xs">challenged you</span>
          </div>
          
          <p className="text-foreground font-medium text-sm mb-3 line-clamp-2">{challenge.challenge_text}</p>
          
          <div className="flex items-center justify-between">
            <div 
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono",
                isCritical 
                  ? "bg-destructive/10 text-destructive" 
                  : isUrgent 
                    ? "bg-muted text-muted-foreground" 
                    : "bg-muted text-foreground"
              )}
            >
              <Clock className="w-3 h-3" />
              <span className="font-medium">{timeLeft}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDismiss(challenge.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant={isCritical ? "destructive" : "default"}
                size="sm"
                onClick={() => onRespond(challenge.id)}
                className="gap-1.5 h-8 px-3 text-xs font-medium"
              >
                <Camera className="w-3.5 h-3.5" />
                Respond
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
