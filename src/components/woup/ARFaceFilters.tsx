import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Sparkles, Send, Sticker, Type, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface ARFaceFiltersProps {
  onCapture: (imageUrl: string) => void;
  onClose: () => void;
}

// Gen Z style stickers organized by category
const STICKER_CATEGORIES = {
  'Popular ✨': ['✨', '💅', '🔥', '💀', '😭', '🤌', '👁️', '🦋', '🌈', '⭐', '💖', '🥺'],
  'Face Props 🎭': ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🐵', '👓', '🕶️', '🥽', '🎭'],
  'Hats & Hair 🎩': ['👑', '🎩', '🧢', '👒', '🎀', '💇‍♀️', '🦄', '🌸', '🌺', '🌻', '🌼', '💐'],
  'Fun 🎉': ['😂', '❤️‍🔥', '🤡', '🥵', '👻', '🎉', '🍀', '🌟', '💜', '💯', '🙌', '👀'],
  'Aesthetic 🌙': ['🌙', '⚡', '🔮', '💎', '🪐', '🌊', '🍃', '🦢', '🕊️', '🐚', '🎐', '🪷'],
};

// AR Face filters with visual overlays (simulated AR effects)
const AR_OVERLAYS = [
  { id: 'none', name: 'None', overlay: null, effect: '', faceOverlay: null },
  { id: 'dog', name: 'Puppy', overlay: '🐶', effect: 'saturate-110', faceOverlay: 'dog-ears' },
  { id: 'cat', name: 'Kitty', overlay: '🐱', effect: 'saturate-110', faceOverlay: 'cat-ears' },
  { id: 'bunny', name: 'Bunny', overlay: '🐰', effect: 'brightness-105', faceOverlay: 'bunny-ears' },
  { id: 'glasses', name: 'Cool', overlay: '😎', effect: '', faceOverlay: 'glasses' },
  { id: 'crown', name: 'Queen', overlay: '👑', effect: 'saturate-120', faceOverlay: 'crown' },
  { id: 'hearts', name: 'Hearts', overlay: '💖', effect: 'saturate-125 hue-rotate-[330deg]', faceOverlay: 'hearts' },
  { id: 'fire', name: 'Fire', overlay: '🔥', effect: 'saturate-150 contrast-110', faceOverlay: 'fire' },
  { id: 'butterfly', name: 'Butterfly', overlay: '🦋', effect: 'saturate-125', faceOverlay: 'butterfly' },
  { id: 'stars', name: 'Stars', overlay: '⭐', effect: 'brightness-110 saturate-130', faceOverlay: 'stars' },
  { id: 'sparkle', name: 'Sparkle', overlay: '✨', effect: 'brightness-110 saturate-110', faceOverlay: 'sparkle' },
  { id: 'nerd', name: 'Nerd', overlay: '🤓', effect: '', faceOverlay: 'nerd-glasses' },
  { id: 'vintage', name: 'Vintage', overlay: null, effect: 'sepia-[0.3] contrast-110', faceOverlay: null },
  { id: 'bw', name: 'B&W', overlay: null, effect: 'grayscale', faceOverlay: null },
  { id: 'cool', name: 'Frost', overlay: '❄️', effect: 'hue-rotate-[200deg] saturate-110', faceOverlay: 'frost' },
  { id: 'warm', name: 'Warm', overlay: '☀️', effect: 'hue-rotate-[20deg] saturate-130', faceOverlay: null },
  { id: 'neon', name: 'Neon', overlay: '💜', effect: 'saturate-200 brightness-110 contrast-125', faceOverlay: 'neon' },
  { id: 'alien', name: 'Alien', overlay: '👽', effect: 'hue-rotate-[100deg]', faceOverlay: 'alien' },
];

interface PlacedSticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const isNative = Capacitor.isNativePlatform();

const ARFaceFilters = ({ onCapture, onClose }: ARFaceFiltersProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState(AR_OVERLAYS[0]);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Popular ✨');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    // On native, we'll use Capacitor Camera plugin directly for capture
    if (isNative) {
      setIsLoading(false);
      return;
    }

    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      });

      setStream(newStream);
      setIsLoading(false);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      setIsLoading(false);
    }
  }, [stream]);

  useEffect(() => {
    startCamera('user');
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const switchCamera = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (!isNative) {
      await startCamera(newMode);
    }
  };

  const addSticker = (emoji: string) => {
    setStickers(prev => [...prev, {
      id: crypto.randomUUID(),
      emoji,
      x: 50 + Math.random() * 20 - 10,
      y: 50 + Math.random() * 20 - 10,
      rotation: Math.random() * 30 - 15,
      scale: 1,
    }]);
  };

  // Native camera capture using Capacitor
  const captureNativePhoto = async () => {
    try {
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: facingMode === 'user' ? 'front' as any : 'rear' as any,
      });
      
      if (photo.dataUrl) {
        setCapturedImage(photo.dataUrl);
      }
    } catch (error) {
      console.error('Native camera error:', error);
    }
  };

  // Web camera capture
  const captureWebPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);
    
    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageUrl);
  };

  const capturePhoto = () => {
    if (isNative) {
      captureNativePhoto();
    } else {
      captureWebPhoto();
    }
  };

  const handleSend = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setStickers([]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 safe-top">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-black/30 backdrop-blur-md">
          <X className="w-6 h-6 text-white" />
        </Button>
        
        {!capturedImage && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={switchCamera}
            className="rounded-full bg-black/30 backdrop-blur-md"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </Button>
        )}
      </div>

      {/* Camera/Photo view */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!capturedImage ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${activeFilter.effect}`}
          />
        ) : (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className={`w-full h-full object-cover ${activeFilter.effect}`}
          />
        )}

        {/* AR Filter Overlay - Enhanced with face prop effects */}
        {activeFilter.faceOverlay && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dog ears */}
            {activeFilter.faceOverlay === 'dog-ears' && (
              <>
                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute top-[15%] left-[20%] text-7xl transform -rotate-12">🐶</motion.div>
                <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="absolute top-[18%] left-[25%] text-4xl">👅</motion.div>
              </>
            )}
            {/* Cat ears */}
            {activeFilter.faceOverlay === 'cat-ears' && (
              <>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-[12%] left-[25%] text-6xl">🐱</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-[30%] left-[35%] text-2xl">✨</motion.div>
              </>
            )}
            {/* Bunny ears */}
            {activeFilter.faceOverlay === 'bunny-ears' && (
              <motion.div initial={{ y: -30 }} animate={{ y: 0 }} className="absolute top-[10%] left-[30%] text-7xl">🐰</motion.div>
            )}
            {/* Glasses */}
            {(activeFilter.faceOverlay === 'glasses' || activeFilter.faceOverlay === 'nerd-glasses') && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-[35%] left-[30%] text-6xl">{activeFilter.faceOverlay === 'nerd-glasses' ? '🤓' : '😎'}</motion.div>
            )}
            {/* Crown */}
            {activeFilter.faceOverlay === 'crown' && (
              <motion.div initial={{ y: -50, rotate: -10 }} animate={{ y: 0, rotate: 0 }} className="absolute top-[8%] left-[28%] text-7xl">👑</motion.div>
            )}
            {/* Hearts floating */}
            {activeFilter.faceOverlay === 'hearts' && (
              <>
                <motion.div animate={{ y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-[15%] left-[20%] text-5xl">💖</motion.div>
                <motion.div animate={{ y: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute top-[20%] right-[20%] text-4xl">💕</motion.div>
                <motion.div animate={{ y: [-5, 15, -5] }} transition={{ repeat: Infinity, duration: 1.8 }} className="absolute top-[10%] left-[45%] text-3xl">💗</motion.div>
              </>
            )}
            {/* Fire */}
            {activeFilter.faceOverlay === 'fire' && (
              <>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }} className="absolute bottom-[20%] left-[15%] text-6xl">🔥</motion.div>
                <motion.div animate={{ scale: [1.1, 1, 1.1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="absolute bottom-[22%] right-[15%] text-5xl">🔥</motion.div>
              </>
            )}
            {/* Butterfly */}
            {activeFilter.faceOverlay === 'butterfly' && (
              <>
                <motion.div animate={{ x: [-20, 20, -20], y: [-10, 10, -10] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-[20%] left-[10%] text-5xl">🦋</motion.div>
                <motion.div animate={{ x: [20, -20, 20], y: [10, -10, 10] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute top-[15%] right-[10%] text-4xl">🦋</motion.div>
              </>
            )}
            {/* Stars */}
            {activeFilter.faceOverlay === 'stars' && (
              <>
                <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-[10%] left-[20%] text-5xl">⭐</motion.div>
                <motion.div animate={{ rotate: -360, scale: [1.1, 1, 1.1] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute top-[15%] right-[25%] text-4xl">🌟</motion.div>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute top-[8%] left-[45%] text-3xl">✨</motion.div>
              </>
            )}
            {/* Sparkle */}
            {activeFilter.faceOverlay === 'sparkle' && (
              <>
                <motion.div animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 0.8] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute top-[20%] left-[15%] text-4xl">✨</motion.div>
                <motion.div animate={{ opacity: [1, 0, 1], scale: [1.2, 0.8, 1.2] }} transition={{ repeat: Infinity, duration: 1.2 }} className="absolute top-[25%] right-[20%] text-3xl">✨</motion.div>
                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.8 }} className="absolute top-[15%] left-[40%] text-5xl">✨</motion.div>
              </>
            )}
            {/* Alien */}
            {activeFilter.faceOverlay === 'alien' && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-[30%] left-[30%] text-7xl">👽</motion.div>
            )}
            {/* Neon glow */}
            {activeFilter.faceOverlay === 'neon' && (
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 via-transparent to-pink-500/30 mix-blend-overlay" />
            )}
            {/* Frost */}
            {activeFilter.faceOverlay === 'frost' && (
              <>
                <motion.div animate={{ y: [0, 50] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-[5%] left-[20%] text-3xl opacity-70">❄️</motion.div>
                <motion.div animate={{ y: [0, 60] }} transition={{ repeat: Infinity, duration: 4, delay: 0.5 }} className="absolute top-[0%] left-[50%] text-2xl opacity-60">❄️</motion.div>
                <motion.div animate={{ y: [0, 40] }} transition={{ repeat: Infinity, duration: 2.5, delay: 1 }} className="absolute top-[3%] right-[25%] text-4xl opacity-50">❄️</motion.div>
              </>
            )}
          </div>
        )}

        {/* Simple overlay for non-face-prop filters */}
        {activeFilter.overlay && !activeFilter.faceOverlay && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5 }}
              className="text-8xl opacity-60"
            >
              {activeFilter.overlay}
            </motion.div>
          </div>
        )}

        {/* Placed stickers */}
        {stickers.map(sticker => (
          <motion.div
            key={sticker.id}
            drag
            dragMomentum={false}
            initial={{ scale: 0 }}
            animate={{ scale: sticker.scale, rotate: sticker.rotation }}
            className="absolute cursor-move select-none"
            style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: 'translate(-50%, -50%)' }}
            onDoubleClick={() => setStickers(prev => prev.filter(s => s.id !== sticker.id))}
          >
            <span className="text-6xl drop-shadow-lg">{sticker.emoji}</span>
          </motion.div>
        ))}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Stickers Panel - Categorized */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-32 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-3xl z-10"
          >
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
              {Object.keys(STICKER_CATEGORIES).map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                    activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="text-white/60 text-xs mb-3 text-center">tap to add, double-tap to remove ✨</p>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
              {STICKER_CATEGORIES[activeCategory as keyof typeof STICKER_CATEGORIES].map((emoji, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => addSticker(emoji)}
                  className="text-3xl p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Panel - With AR overlays */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-32 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-3xl z-10"
          >
            <p className="text-white/60 text-xs mb-3 text-center">AR Face Effects & Filters 🎭</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {AR_OVERLAYS.map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                    activeFilter.id === filter.id ? 'bg-primary/30 ring-2 ring-primary' : 'hover:bg-white/10'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-primary/50 to-secondary/50 flex items-center justify-center ${filter.effect}`}>
                    {filter.overlay ? <span className="text-2xl">{filter.overlay}</span> : <Sparkles className="w-6 h-6 text-white" />}
                  </div>
                  <span className="text-xs text-white">{filter.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 safe-bottom">
        <div className="flex items-center justify-between">
          {/* Left tools */}
          <div className="flex gap-2">
            <Button
              variant={showStickers ? 'neon' : 'glass'}
              size="icon"
              onClick={() => { setShowStickers(!showStickers); setShowFilters(false); }}
              className="rounded-full"
            >
              <Sticker className="w-5 h-5" />
            </Button>
            <Button
              variant={showFilters ? 'neon' : 'glass'}
              size="icon"
              onClick={() => { setShowFilters(!showFilters); setShowStickers(false); }}
              className="rounded-full"
            >
              <Sparkles className="w-5 h-5" />
            </Button>
          </div>

          {/* Capture/Send button */}
          {!capturedImage ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full bg-white border-4 border-primary shadow-lg shadow-primary/30"
            />
          ) : (
            <div className="flex gap-3">
              <Button variant="glass" onClick={retake} className="rounded-full px-6">
                <RotateCcw className="w-5 h-5 mr-2" /> Retake
              </Button>
              <Button variant="neon" onClick={handleSend} className="rounded-full px-6">
                <Send className="w-5 h-5 mr-2" /> Send
              </Button>
            </div>
          )}

          {/* Right placeholder for balance */}
          <div className="w-24" />
        </div>
      </div>
    </motion.div>
  );
};

export default ARFaceFilters;