import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Sparkles, Crown, Zap, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

const Invite = () => {
  const [searchParams] = useSearchParams();
  const [showContent, setShowContent] = useState(false);

  const username = searchParams.get('from') || 'Someone special';
  const message = searchParams.get('msg') || 'You have been invited to join WOUP!';
  const emoji = searchParams.get('emoji') || '🎰';

  useEffect(() => {
    // Initial confetti
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#4ade80', '#f472b6', '#22d3ee', '#a855f7', '#facc15']
      });
    }, 300);

    setShowContent(true);

    // Continuous side confetti
    const interval = setInterval(() => {
      confetti({ particleCount: 20, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#4ade80', '#f472b6'] });
      confetti({ particleCount: 20, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#a855f7', '#22d3ee'] });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleJoin = () => {
    confetti({ particleCount: 200, spread: 180, origin: { y: 0.5 } });
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=tulsi.beta.solvex';
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden relative flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      {showContent && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative z-10 w-full max-w-sm text-center space-y-6"
        >
          {/* Logo */}
          <motion.h1 
            className="text-5xl font-black bg-gradient-to-r from-green-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            WOUP
          </motion.h1>
          <p className="text-gray-400 text-sm">The vibe is calling ✨</p>

          {/* Invite Card */}
          <motion.div
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-3xl blur-lg opacity-40" />
            
            <div className="relative bg-[#1a1a2e]/90 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              {/* Sender */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/20 border border-pink-500/30 mb-4">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-white text-sm">{username}</span>
                <span className="text-gray-400 text-sm">spun for you!</span>
              </div>

              {/* Emoji */}
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-7xl my-4"
              >
                {emoji}
              </motion.div>

              {/* Message */}
              <p className="text-lg font-bold text-white leading-relaxed">{message}</p>
            </div>
          </motion.div>

          {/* Join Button */}
          <motion.button
            onClick={handleJoin}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full py-4 px-6 bg-gradient-to-r from-green-400 to-cyan-400 rounded-2xl text-black font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
          >
            <Download className="w-5 h-5" />
            JOIN THE VIBES! 🚀
          </motion.button>

          <p className="text-gray-500 text-xs flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            Free on Play Store
          </p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 border-2 border-[#0a0a0f]" />
              ))}
            </div>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
              Friends are waiting!
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Invite;