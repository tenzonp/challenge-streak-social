import { useState, useEffect } from 'react';
import { Clock, Camera, X, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Profile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-5",
        "border-2 transition-all duration-300",
        isCritical 
          ? "border-destructive bg-destructive/10 animate-shake shadow-[0_0_30px_hsl(var(--destructive)/0.4)]" 
          : isUrgent 
            ? "border-neon-orange/50 bg-neon-orange/5 shadow-[0_0_20px_hsl(var(--neon-orange)/0.3)]" 
            : "border-neon-pink/50 bg-neon-pink/5 shadow-neon-pink"
      )}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className={cn(
            "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl",
            isCritical ? "bg-destructive/30" : isUrgent ? "bg-neon-orange/30" : "bg-neon-pink/30"
          )}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      
      {/* Challenge label */}
      <motion.div 
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full gradient-challenge"
        animate={isCritical ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <Zap className="w-3.5 h-3.5 text-primary-foreground" />
        <span className="text-xs font-bold text-primary-foreground uppercase tracking-wide">challenge</span>
      </motion.div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted/50">
        <motion.div 
          className={cn(
            "h-full transition-all duration-1000",
            isCritical ? "bg-destructive" : isUrgent ? "bg-neon-orange" : "gradient-challenge"
          )}
          style={{ width: `${progress}%` }}
          animate={isCritical ? { opacity: [1, 0.5, 1] } : {}}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      </div>
      
      <div className="flex items-start gap-4 relative z-10">
        <motion.div 
          className="relative"
          animate={{ rotate: isCritical ? [-2, 2, -2] : 0 }}
          transition={{ duration: 0.3, repeat: Infinity }}
        >
          <img 
            src={challenge.from_user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=default`} 
            alt={challenge.from_user?.display_name || 'User'}
            className="w-14 h-14 rounded-2xl border-2 border-neon-pink/50"
          />
          <motion.div 
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gradient-challenge flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </motion.div>
        </motion.div>
        
        <div className="flex-1 pt-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg">{challenge.from_user?.display_name || 'Friend'}</span>
            <span className="text-muted-foreground">challenged you!</span>
          </div>
          
          <p className="text-xl font-bold mb-4 text-gradient-challenge">{challenge.challenge_text}</p>
          
          <div className="flex items-center justify-between">
            <motion.div 
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-mono",
                isCritical 
                  ? "bg-destructive/30 text-destructive border border-destructive/50" 
                  : isUrgent 
                    ? "bg-neon-orange/20 text-neon-orange border border-neon-orange/30" 
                    : "bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
              )}
              animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Clock className="w-4 h-4" />
              <span className="font-bold text-lg">{timeLeft}</span>
            </motion.div>
            
            <div className="flex items-center gap-2">
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDismiss(challenge.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant={isCritical ? "destructive" : "neon"}
                  onClick={() => onRespond(challenge.id)}
                  className="gap-2 font-bold text-base px-5 h-11"
                >
                  <Camera className="w-5 h-5" />
                  respond now!
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChallengeCard;
