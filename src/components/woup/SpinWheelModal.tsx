import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Share2, Copy, ExternalLink, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import confetti from 'canvas-confetti';

const SPIN_RESULTS = [
  { id: 1, emoji: '🤪', text: "Drag Your Bestie Forever and Tell Them to Show Funniest Face", color: 'from-pink-500 to-rose-500' },
  { id: 2, emoji: '😈', text: "Drag your Most Chutiya Friend And Tell them to Start Action Here too", color: 'from-purple-500 to-violet-500' },
  { id: 3, emoji: '🥰', text: "Drag your Cutest Friend And Tell them To Show Moves", color: 'from-cyan-500 to-blue-500' },
  { id: 4, emoji: '🤫', text: "Drag that From which You cant Stay without telling all secret", color: 'from-green-500 to-emerald-500' },
  { id: 5, emoji: '💕', text: "Drag Your lovely Lova lov Friends and Share a Moment", color: 'from-red-500 to-pink-500' },
];

const DAILY_SPINS_KEY = 'woup_daily_spins';
const SPINS_DATE_KEY = 'woup_spins_date';
const MAX_SPINS = 5;

interface SpinWheelModalProps {
  onClose: () => void;
}

const SpinWheelModal = ({ onClose }: SpinWheelModalProps) => {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [spinsLeft, setSpinsLeft] = useState(MAX_SPINS);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<typeof SPIN_RESULTS[0] | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Load spins from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(SPINS_DATE_KEY);
    
    if (savedDate !== today) {
      // Reset spins for new day
      localStorage.setItem(SPINS_DATE_KEY, today);
      localStorage.setItem(DAILY_SPINS_KEY, String(MAX_SPINS));
      setSpinsLeft(MAX_SPINS);
    } else {
      const savedSpins = localStorage.getItem(DAILY_SPINS_KEY);
      setSpinsLeft(savedSpins ? parseInt(savedSpins) : MAX_SPINS);
    }
  }, []);

  const handleSpin = () => {
    if (spinsLeft <= 0 || isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);
    setResult(null);

    // Random result
    const randomIndex = Math.floor(Math.random() * SPIN_RESULTS.length);
    const selectedResult = SPIN_RESULTS[randomIndex];

    // Calculate rotation - at least 5 full rotations + position to land on result
    const baseRotation = 360 * 5;
    const segmentAngle = 360 / SPIN_RESULTS.length;
    const resultRotation = baseRotation + (randomIndex * segmentAngle) + (segmentAngle / 2);
    
    setRotation(prev => prev + resultRotation);

    // After spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setResult(selectedResult);
      setShowResult(true);
      
      // Update spins left
      const newSpins = spinsLeft - 1;
      setSpinsLeft(newSpins);
      localStorage.setItem(DAILY_SPINS_KEY, String(newSpins));

      // Fire confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4ade80', '#f472b6', '#22d3ee', '#a855f7', '#facc15']
      });
    }, 3000);
  };

  const generateInviteLink = () => {
    if (!result || !profile) return '';
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      from: profile.display_name,
      msg: result.text,
      emoji: result.emoji
    });
    return `${baseUrl}/invite?${params.toString()}`;
  };

  const handleShare = async () => {
    if (!result || !profile) return;
    
    const inviteLink = generateInviteLink();
    const shareText = `🎰 ${profile.display_name} spun the wheel for YOU!\n\n${result.emoji} ${result.text}\n\n✨ Join WOUP now!\n`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WOUP Invite',
          text: shareText,
          url: inviteLink
        });
        toast({ title: 'Shared successfully! 🎉' });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(shareText + inviteLink);
      toast({ title: 'Link copied! 📋' });
    }
  };

  const handleCopyLink = async () => {
    if (!result || !profile) return;
    
    const inviteLink = generateInviteLink();
    
    await navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Link copied to clipboard! 📋' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        className="relative w-full max-w-md bg-gradient-to-br from-background via-background to-muted rounded-3xl border border-border/50 overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="inline-block mb-2"
          >
            <Gift className="w-12 h-12 text-neon-pink" />
          </motion.div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-neon-pink via-neon-purple to-neon-cyan bg-clip-text text-transparent">
            SPIN & INVITE! 🎰
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {spinsLeft} spins left today
          </p>
        </div>

        {/* Wheel Container */}
        <div className="relative h-80 flex items-center justify-center">
          {/* Pointer */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-neon-yellow drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 3, ease: [0.2, 0.8, 0.4, 1] }}
            className="relative w-64 h-64"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
              {SPIN_RESULTS.map((item, index) => {
                const angle = (360 / SPIN_RESULTS.length) * index;
                const nextAngle = (360 / SPIN_RESULTS.length) * (index + 1);
                const startRad = (angle - 90) * (Math.PI / 180);
                const endRad = (nextAngle - 90) * (Math.PI / 180);
                const x1 = 100 + 95 * Math.cos(startRad);
                const y1 = 100 + 95 * Math.sin(startRad);
                const x2 = 100 + 95 * Math.cos(endRad);
                const y2 = 100 + 95 * Math.sin(endRad);
                const largeArc = nextAngle - angle > 180 ? 1 : 0;
                
                const colors = [
                  '#ec4899', '#a855f7', '#22d3ee', '#4ade80', '#f472b6'
                ];
                
                return (
                  <g key={item.id}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={colors[index]}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text
                      x={100 + 55 * Math.cos((startRad + endRad) / 2)}
                      y={100 + 55 * Math.sin((startRad + endRad) / 2)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="24"
                      transform={`rotate(${(angle + nextAngle) / 2}, ${100 + 55 * Math.cos((startRad + endRad) / 2)}, ${100 + 55 * Math.sin((startRad + endRad) / 2)})`}
                    >
                      {item.emoji}
                    </text>
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="100" cy="100" r="20" fill="#1a1a2e" stroke="#fff" strokeWidth="3" />
              <text x="100" y="100" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="12" fontWeight="bold">
                SPIN
              </text>
            </svg>
          </motion.div>
        </div>

        {/* Spin Button or Result */}
        <div className="p-6 pt-0">
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                key="spin-button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Button
                  onClick={handleSpin}
                  disabled={spinsLeft <= 0 || isSpinning}
                  className="w-full h-14 text-lg font-black gradient-primary shadow-neon-green"
                >
                  {isSpinning ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Sparkles className="w-6 h-6" />
                    </motion.span>
                  ) : spinsLeft <= 0 ? (
                    'No spins left today 😢'
                  ) : (
                    <>
                      <Zap className="w-6 h-6 mr-2" />
                      SPIN THE WHEEL!
                    </>
                  )}
                </Button>
              </motion.div>
            ) : result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Result Card */}
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className={`p-4 rounded-2xl bg-gradient-to-r ${result.color} text-white text-center`}
                >
                  <span className="text-4xl mb-2 block">{result.emoji}</span>
                  <p className="font-bold text-sm leading-relaxed">{result.text}</p>
                </motion.div>

                {/* Share Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleShare}
                    className="flex-1 gradient-secondary shadow-neon-pink"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="w-5 h-5 mr-2" />
                    Copy Link
                  </Button>
                </div>

                {/* Spin Again */}
                {spinsLeft > 0 && (
                  <Button
                    onClick={() => {
                      setShowResult(false);
                      setResult(null);
                    }}
                    variant="ghost"
                    className="w-full text-muted-foreground"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Spin Again ({spinsLeft} left)
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-neon-pink/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-neon-cyan/20 rounded-full blur-3xl pointer-events-none" />
      </motion.div>
    </motion.div>
  );
};

export default SpinWheelModal;
