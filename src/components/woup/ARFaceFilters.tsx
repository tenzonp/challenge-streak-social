import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, Sparkles, Send, Sticker, Type, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ARFaceFiltersProps {
  onCapture: (imageUrl: string) => void;
  onClose: () => void;
}

// Gen Z style stickers
const GENZ_STICKERS = [
  '✨', '💅', '🔥', '💀', '😭', '🤌', '👁️', '🦋', '🌈', '⭐',
  '💖', '🥺', '😍', '🤯', '💯', '🙌', '👀', '🎀', '🌸', '💫',
  '😂', '❤️‍🔥', '🤡', '🥵', '💀', '👻', '🎉', '🍀', '🌟', '💜'
];

// AR Face filters with CSS effects
const FACE_FILTERS = [
  { id: 'none', name: 'None', overlay: null, effect: '' },
  { id: 'sparkle', name: 'Sparkle', overlay: '✨', effect: 'brightness-110 saturate-110' },
  { id: 'hearts', name: 'Hearts', overlay: '💖', effect: 'saturate-125 hue-rotate-[330deg]' },
  { id: 'fire', name: 'Fire', overlay: '🔥', effect: 'saturate-150 contrast-110' },
  { id: 'butterfly', name: 'Butterfly', overlay: '🦋', effect: 'saturate-125 hue-rotate-[200deg]' },
  { id: 'stars', name: 'Stars', overlay: '⭐', effect: 'brightness-110 saturate-130' },
  { id: 'glam', name: 'Glam', overlay: '💎', effect: 'brightness-105 contrast-105 saturate-110' },
  { id: 'vintage', name: 'Vintage', overlay: null, effect: 'sepia-[0.3] contrast-110' },
  { id: 'bw', name: 'B&W', overlay: null, effect: 'grayscale' },
  { id: 'cool', name: 'Cool', overlay: '❄️', effect: 'hue-rotate-[200deg] saturate-110' },
  { id: 'warm', name: 'Warm', overlay: '☀️', effect: 'hue-rotate-[20deg] saturate-130' },
  { id: 'neon', name: 'Neon', overlay: '💜', effect: 'saturate-200 brightness-110 contrast-125' },
];

interface PlacedSticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const ARFaceFilters = ({ onCapture, onClose }: ARFaceFiltersProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState(FACE_FILTERS[0]);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [showStickers, setShowStickers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
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
    await startCamera(newMode);
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

  const capturePhoto = () => {
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

        {/* AR Filter Overlay */}
        {activeFilter.overlay && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5 }}
              className="text-8xl opacity-60"
            >
              {activeFilter.overlay}
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="absolute top-20 left-10 text-5xl opacity-40"
            >
              {activeFilter.overlay}
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute bottom-40 right-10 text-6xl opacity-50"
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

      {/* Stickers Panel */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-32 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-3xl z-10"
          >
            <p className="text-white/60 text-xs mb-3 text-center">tap to add, double-tap to remove ✨</p>
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
              {GENZ_STICKERS.map((emoji, i) => (
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

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            className="absolute bottom-32 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-3xl z-10"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {FACE_FILTERS.map(filter => (
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