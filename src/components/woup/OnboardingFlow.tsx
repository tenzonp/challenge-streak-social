import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, Flame, Trophy, Camera, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Zap,
    title: "Challenge Your Friends",
    description: "Send photo challenges to your friends and wait for their epic responses!",
    gradient: "from-neon-green to-neon-cyan",
    emoji: "⚡"
  },
  {
    icon: Camera,
    title: "Capture The Moment",
    description: "You have 1 hour to respond with a dual camera snap - front and back!",
    gradient: "from-neon-pink to-neon-purple",
    emoji: "📸"
  },
  {
    icon: Flame,
    title: "Build Your Streak",
    description: "Complete challenges daily to build your streak and earn rewards!",
    gradient: "from-neon-orange to-neon-pink",
    emoji: "🔥"
  },
  {
    icon: Trophy,
    title: "Unlock Achievements",
    description: "Hit milestones and climb the leaderboard to become a legend!",
    gradient: "from-neon-yellow to-neon-green",
    emoji: "🏆"
  },
  {
    icon: Users,
    title: "Connect With Friends",
    description: "Add friends, set top friends, and create your inner circle!",
    gradient: "from-neon-purple to-neon-pink",
    emoji: "👥"
  }
];

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: Math.random() * 100 + 50,
              height: Math.random() * 100 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `linear-gradient(135deg, hsl(var(--neon-${['green', 'pink', 'purple', 'cyan'][i % 4]})), transparent)`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Skip button */}
      <div className="relative z-10 p-4 flex justify-end">
        <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      {/* Slide content */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            {/* Animated icon */}
            {(() => {
              const IconComponent = slides[currentSlide].icon;
              return (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, delay: 0.2 }}
                  className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${slides[currentSlide].gradient} flex items-center justify-center mb-8 shadow-2xl`}
                  style={{
                    boxShadow: `0 0 60px hsl(var(--neon-${currentSlide % 2 === 0 ? 'green' : 'pink'}) / 0.4)`,
                  }}
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <IconComponent className="w-16 h-16 text-white" />
                  </motion.div>
                </motion.div>
              );
            })()}

            {/* Emoji burst */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-6xl mb-6"
            >
              {slides[currentSlide].emoji}
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
            >
              {slides[currentSlide].title}
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-muted-foreground"
            >
              {slides[currentSlide].description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10 p-8 space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8 bg-gradient-to-r from-neon-green to-neon-pink' 
                  : 'w-2 bg-muted-foreground/30'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        {/* Next/Get Started button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleNext}
            className="w-full h-14 text-lg font-semibold rounded-2xl gradient-rainbow shadow-neon-green"
          >
            {isLastSlide ? (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default OnboardingFlow;
