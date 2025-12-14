import { Home, Zap, User, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type Tab = 'feed' | 'challenges' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onCreatePost: () => void;
  onSpinWheel: () => void;
}

const BottomNav = ({ activeTab, onTabChange, onCreatePost, onSpinWheel }: BottomNavProps) => {
  const tabs: { id: Tab; icon: typeof Home; label: string; activeColor: string }[] = [
    { id: 'feed', icon: Home, label: 'Feed', activeColor: 'text-neon-cyan' },
    { id: 'challenges', icon: Zap, label: 'Social', activeColor: 'text-neon-pink' },
    { id: 'profile', icon: User, label: 'You', activeColor: 'text-neon-purple' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-border/30 pb-safe">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-around">
        {/* Left tab */}
        <motion.button
          onClick={() => onTabChange(tabs[0].id)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-3 sm:px-5 rounded-xl transition-all duration-200",
            activeTab === tabs[0].id 
              ? "bg-neon-cyan/20 text-neon-cyan" 
              : "text-muted-foreground active:text-foreground"
          )}
          whileTap={{ scale: 0.9 }}
        >
          <Home className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] sm:text-[10px] font-bold">{tabs[0].label}</span>
        </motion.button>

        {/* Center create/spin button */}
        <motion.button 
          onClick={onSpinWheel} 
          className="relative -mt-6"
          whileTap={{ scale: 0.9 }}
        >
          <motion.div 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full gradient-primary flex items-center justify-center shadow-neon-green"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Plus className="w-7 h-7 sm:w-8 sm:h-8 text-primary-foreground" />
          </motion.div>
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neon-pink flex items-center justify-center"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Sparkles className="w-3 h-3 text-white" />
          </motion.div>
        </motion.button>

        {/* Middle tab - Social/Challenges */}
        <motion.button
          onClick={() => onTabChange(tabs[1].id)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-3 sm:px-5 rounded-xl transition-all duration-200 relative",
            activeTab === tabs[1].id 
              ? "bg-neon-pink/20 text-neon-pink" 
              : "text-muted-foreground active:text-foreground"
          )}
          whileTap={{ scale: 0.9 }}
        >
          <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] sm:text-[10px] font-bold">{tabs[1].label}</span>
        </motion.button>

        {/* Right tab */}
        <motion.button
          onClick={() => onTabChange(tabs[2].id)}
          className={cn(
            "flex flex-col items-center gap-0.5 py-2 px-3 sm:px-5 rounded-xl transition-all duration-200",
            activeTab === tabs[2].id 
              ? "bg-neon-purple/20 text-neon-purple" 
              : "text-muted-foreground active:text-foreground"
          )}
          whileTap={{ scale: 0.9 }}
        >
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[9px] sm:text-[10px] font-bold">{tabs[2].label}</span>
        </motion.button>
      </div>
    </nav>
  );
};

export default BottomNav;
