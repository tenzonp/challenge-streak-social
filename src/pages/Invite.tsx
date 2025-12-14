import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Zap, Download, PartyPopper, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

const EMOJIS = ['🎰', '🤪', '😈', '🥰', '🤫', '💕', '✨', '🔥', '💫', '🎉'];

const Invite = () => {
  const [searchParams] = useSearchParams();
  const [showContent, setShowContent] = useState(false);
  const [currentEmoji, setCurrentEmoji] = useState(0);

  const username = searchParams.get('from') || 'Someone special';
  const message = searchParams.get('msg') || 'You have been invited to join WOUP!';
  const emoji = searchParams.get('emoji') || '🎰';

  useEffect(() => {
    // Initial confetti burst
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#4ade80', '#f472b6', '#22d3ee', '#a855f7', '#facc15']
      });
    }, 500);

    // Show content with delay for dramatic effect
    setTimeout(() => setShowContent(true), 300);

    // Continuous confetti
    const interval = setInterval(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4ade80', '#f472b6', '#22d3ee']
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#a855f7', '#facc15', '#f472b6']
      });
    }, 2000);

    // Emoji rotation
    const emojiInterval = setInterval(() => {
      setCurrentEmoji(prev => (prev + 1) % EMOJIS.length);
    }, 200);

    setTimeout(() => clearInterval(emojiInterval), 2000);

    return () => {
      clearInterval(interval);
      clearInterval(emojiInterval);
    };
  }, []);

  const handleJoin = () => {
    // Fire massive confetti
    confetti({
      particleCount: 200,
      spread: 180,
      origin: { y: 0.5 },
      colors: ['#4ade80', '#f472b6', '#22d3ee', '#a855f7', '#facc15']
    });

    // Redirect to Play Store after short delay
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=tulsi.beta.solvex';
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: -50,
              rotate: 0,
              opacity: 0.7
            }}
            animate={{ 
              y: window.innerHeight + 50,
              rotate: 360,
              opacity: 0
            }}
            transition={{ 
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear"
            }}
          >
            {EMOJIS[i % EMOJIS.length]}
          </motion.div>
        ))}
      </div>

      {/* Glowing orbs */}
      <motion.div 
        className="absolute top-20 left-10 w-64 h-64 bg-neon-pink/30 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-64 h-64 bg-neon-cyan/30 rounded-full blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-neon-purple/20 rounded-full blur-3xl"
        animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <AnimatePresence>
          {showContent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="w-full max-w-md text-center space-y-8"
            >
              {/* Logo/Brand */}
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.h1 
                  className="text-6xl font-black bg-gradient-to-r from-neon-green via-neon-cyan to-neon-pink bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  WOUP
                </motion.h1>
                <p className="text-muted-foreground mt-2">The vibe is calling ✨</p>
              </motion.div>

              {/* Invite card */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="relative"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan rounded-3xl blur-xl opacity-50" />
                
                <div className="relative glass-strong rounded-3xl p-8 border border-border/50">
                  {/* Sender info */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mb-6"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neon-pink/20 to-neon-purple/20 border border-neon-pink/30">
                      <Crown className="w-4 h-4 text-neon-yellow" />
                      <span className="font-bold text-foreground">{username}</span>
                      <span className="text-muted-foreground">spun for you!</span>
                    </div>
                  </motion.div>

                  {/* Big emoji */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                    className="text-8xl mb-6"
                  >
                    <motion.span
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="inline-block"
                    >
                      {showContent ? emoji : EMOJIS[currentEmoji]}
                    </motion.span>
                  </motion.div>

                  {/* Message */}
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-xl font-bold text-foreground leading-relaxed mb-2"
                  >
                    {message}
                  </motion.p>

                  {/* Sparkle decorations */}
                  <motion.div
                    className="absolute -top-3 -right-3"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  >
                    <Star className="w-8 h-8 text-neon-yellow fill-neon-yellow" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-3 -left-3"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-8 h-8 text-neon-cyan" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Call to action */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="space-y-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleJoin}
                    className="w-full h-16 text-xl font-black gradient-primary shadow-neon-green relative overflow-hidden group"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    />
                    <Download className="w-6 h-6 mr-3" />
                    JOIN THE VIBES! 🚀
                    <motion.span
                      className="absolute -right-2 -top-2"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    >
                      <PartyPopper className="w-6 h-6 text-neon-yellow" />
                    </motion.span>
                  </Button>
                </motion.div>

                <motion.p 
                  className="text-sm text-muted-foreground"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap className="w-4 h-4 inline mr-1 text-neon-yellow" />
                  Free on Play Store • Join 10K+ vibers
                </motion.p>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-pink to-neon-purple border-2 border-background"
                    />
                  ))}
                </div>
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-neon-pink fill-neon-pink" />
                  Your friends are already here!
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Invite;
