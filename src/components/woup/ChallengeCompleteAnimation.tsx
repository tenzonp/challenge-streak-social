import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';
import { Sparkles, Trophy, Zap } from 'lucide-react';

interface ChallengeCompleteAnimationProps {
  challengeText: string;
  fromUser: string;
  onComplete: () => void;
}

const ChallengeCompleteAnimation = ({ challengeText, fromUser, onComplete }: ChallengeCompleteAnimationProps) => {
  useEffect(() => {
    // Fire confetti bursts
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors: ['#4ade80', '#f472b6', '#22d3ee', '#facc15'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors: ['#4ade80', '#f472b6', '#22d3ee', '#facc15'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Initial big burst
    confetti({
      particleCount: 100,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#4ade80', '#f472b6', '#22d3ee', '#facc15'],
    });

    frame();

    // Auto-close after animation
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onComplete}
      >
        <motion.div className="text-center px-6 max-w-md">
          {/* Trophy Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="mb-6"
          >
            <motion.div
              className="w-28 h-28 mx-auto rounded-full gradient-challenge flex items-center justify-center shadow-[0_0_60px_hsl(var(--neon-pink)/0.5)]"
              animate={{ 
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 60px hsl(var(--neon-pink)/0.5)',
                  '0 0 80px hsl(var(--neon-green)/0.6)',
                  '0 0 60px hsl(var(--neon-pink)/0.5)',
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Trophy className="w-14 h-14 text-primary-foreground" />
            </motion.div>
          </motion.div>

          {/* Floating emojis */}
          {['🔥', '⚡', '🎉', '💪', '✨'].map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute text-3xl"
              initial={{ 
                opacity: 0, 
                y: 100,
                x: (i - 2) * 60 + 'px',
              }}
              animate={{ 
                opacity: [0, 1, 0],
                y: [-50, -150],
              }}
              transition={{ 
                delay: i * 0.2,
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
              style={{ left: '50%', top: '40%' }}
            >
              {emoji}
            </motion.span>
          ))}
          
          {/* Main Text */}
          <motion.h2
            className="text-4xl font-black mb-2"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-gradient-challenge">CHALLENGE</span>
          </motion.h2>
          
          <motion.h2
            className="text-5xl font-black text-gradient-primary mb-4"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            COMPLETE! 🎉
          </motion.h2>
          
          {/* Challenge details */}
          <motion.div
            className="glass rounded-2xl p-4 mb-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-muted-foreground mb-1">You crushed it!</p>
            <p className="font-bold text-lg">"{challengeText}"</p>
          </motion.div>

          {/* Streak indicator */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.7, type: 'spring' }}
          >
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-neon-green/20 border border-neon-green/50"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Zap className="w-5 h-5 text-neon-green" />
              <span className="font-bold text-neon-green">STREAK +1</span>
              <Sparkles className="w-5 h-5 text-neon-green" />
            </motion.div>
          </motion.div>
          
          <motion.p
            className="text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            tap to continue
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChallengeCompleteAnimation;
