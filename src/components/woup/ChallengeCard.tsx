import { useState, useEffect } from 'react';
import { Clock, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Challenge } from '@/types/woup';
import { cn } from '@/lib/utils';

interface ChallengeCardProps {
  challenge: Challenge;
  onRespond: (challengeId: string) => void;
  onDismiss?: (challengeId: string) => void;
}

const ChallengeCard = ({ challenge, onRespond, onDismiss }: ChallengeCardProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const diff = challenge.expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('expired');
        setProgress(0);
        return;
      }
      
      const totalDuration = challenge.expiresAt.getTime() - challenge.createdAt.getTime();
      const elapsed = now.getTime() - challenge.createdAt.getTime();
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
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-4 animate-slide-up",
      "glass border",
      isUrgent ? "border-destructive/50" : "border-border/50"
    )}>
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <div 
          className={cn(
            "h-full transition-all duration-1000",
            isUrgent ? "bg-destructive" : "gradient-primary"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-start gap-3 mt-2">
        <img 
          src={challenge.fromUser.avatar} 
          alt={challenge.fromUser.displayName}
          className="w-12 h-12 rounded-2xl border-2 border-primary/30"
        />
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{challenge.fromUser.displayName}</span>
            <span className="text-muted-foreground text-sm">challenged you!</span>
          </div>
          
          <p className="text-lg font-medium mb-3">{challenge.challengeText}</p>
          
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              isUrgent ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-semibold">{timeLeft}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDismiss(challenge.id)}
                  className="text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
              <Button 
                variant={isUrgent ? "destructive" : "neon"}
                onClick={() => onRespond(challenge.id)}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                respond
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCard;
