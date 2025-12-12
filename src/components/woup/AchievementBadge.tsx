import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Achievement, useAchievements } from '@/hooks/useAchievements';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

export const AchievementBadge = ({ achievement, unlocked, showProgress, compact }: AchievementBadgeProps) => {
  const { getRarityColor } = useAchievements();
  const rarityColor = getRarityColor(achievement.rarity);

  if (compact) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass"
        style={{ borderColor: unlocked ? rarityColor : 'transparent', borderWidth: unlocked ? 2 : 1 }}
      >
        <span className="text-xl">{achievement.icon}</span>
        <span className={`text-xs font-medium ${unlocked ? '' : 'text-muted-foreground'}`}>
          {achievement.title}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`relative p-4 rounded-2xl glass overflow-hidden transition-all ${unlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}
    >
      {/* Rarity glow */}
      {unlocked && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(circle at center, ${rarityColor}, transparent)` }}
        />
      )}
      
      <div className="relative flex items-start gap-3">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ 
            background: unlocked ? `${rarityColor}20` : 'hsl(var(--muted))',
            borderColor: rarityColor,
            borderWidth: 2
          }}
        >
          {achievement.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold truncate">{achievement.title}</h4>
            <span 
              className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold"
              style={{ background: `${rarityColor}30`, color: rarityColor }}
            >
              {achievement.rarity}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{achievement.description}</p>
          
          {showProgress && !unlocked && (
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: '0%',
                  background: rarityColor 
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AchievementUnlockModalProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementUnlockModal = ({ achievement, onClose }: AchievementUnlockModalProps) => {
  const { getRarityColor } = useAchievements();
  const rarityColor = getRarityColor(achievement.rarity);

  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [rarityColor, '#FFD700', '#FFA500']
    });
  }, [rarityColor]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative max-w-sm w-full"
          onClick={e => e.stopPropagation()}
        >
          {/* Glow effect */}
          <div 
            className="absolute -inset-4 rounded-3xl blur-3xl opacity-50"
            style={{ background: rarityColor }}
          />
          
          <div className="relative glass rounded-3xl p-6 text-center">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-24 h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center text-5xl"
              style={{ 
                background: `${rarityColor}20`,
                borderColor: rarityColor,
                borderWidth: 3
              }}
            >
              {achievement.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: rarityColor }}>
                  Achievement Unlocked!
                </span>
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>

              <h2 className="text-2xl font-bold mb-2">{achievement.title}</h2>
              <p className="text-muted-foreground mb-4">{achievement.description}</p>

              <span 
                className="inline-block px-3 py-1 rounded-full text-xs uppercase font-bold"
                style={{ background: `${rarityColor}30`, color: rarityColor }}
              >
                {achievement.rarity}
              </span>
            </motion.div>

            <Button 
              onClick={onClose}
              variant="neon"
              className="w-full mt-6"
            >
              Awesome! 🎉
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
