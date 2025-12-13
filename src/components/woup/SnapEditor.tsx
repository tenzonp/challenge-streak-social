import { useState, useRef, useCallback } from 'react';
import { X, Send, Sticker, Sparkles, Type, Undo, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface SnapEditorProps {
  imageUrl: string;
  onSend: (editedImageUrl: string) => void;
  onClose: () => void;
}

const STICKERS = ['🔥', '💯', '😍', '🎉', '✨', '💀', '😂', '❤️', '🙌', '👀', '🤯', '💅'];

const FILTERS = [
  { name: 'None', filter: '' },
  { name: 'Vintage', filter: 'sepia(100%)' },
  { name: 'B&W', filter: 'grayscale(100%)' },
  { name: 'Warm', filter: 'saturate(150%) hue-rotate(15deg)' },
  { name: 'Cool', filter: 'saturate(125%) hue-rotate(180deg)' },
  { name: 'Fade', filter: 'contrast(75%) brightness(110%)' },
  { name: 'Vivid', filter: 'saturate(200%) contrast(110%)' },
  { name: 'Drama', filter: 'contrast(125%) brightness(90%)' },
];

interface PlacedSticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

const SnapEditor = ({ imageUrl, onSend, onClose }: SnapEditorProps) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'filters' | 'text' | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [sending, setSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const addSticker = (emoji: string) => {
    setStickers(prev => [...prev, {
      id: crypto.randomUUID(),
      emoji,
      x: 50 + Math.random() * 20 - 10,
      y: 50 + Math.random() * 20 - 10,
      scale: 1,
      rotation: Math.random() * 30 - 15,
    }]);
  };

  const addText = () => {
    if (!newText.trim()) return;
    setTexts(prev => [...prev, {
      id: crypto.randomUUID(),
      text: newText,
      x: 50,
      y: 30,
      color: textColor,
      size: 24,
    }]);
    setNewText('');
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const removeText = (id: string) => {
    setTexts(prev => prev.filter(t => t.id !== id));
  };

  const renderToCanvas = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply filter if selected
        if (selectedFilter.filter) {
          ctx.filter = selectedFilter.filter;
        }

        // Draw the base image
        ctx.drawImage(img, 0, 0);

        // Reset filter for overlays
        ctx.filter = 'none';

        // Draw stickers
        stickers.forEach(sticker => {
          const x = (sticker.x / 100) * canvas.width;
          const y = (sticker.y / 100) * canvas.height;
          const fontSize = Math.min(canvas.width, canvas.height) * 0.1 * sticker.scale;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sticker.emoji, 0, 0);
          ctx.restore();
        });

        // Draw text overlays
        texts.forEach(text => {
          const x = (text.x / 100) * canvas.width;
          const y = (text.y / 100) * canvas.height;
          const fontSize = (text.size / 24) * Math.min(canvas.width, canvas.height) * 0.05;

          ctx.save();
          ctx.translate(x, y);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = text.color;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillText(text.text, 0, 0);
          ctx.restore();
        });

        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = imageUrl;
    });
  }, [imageUrl, selectedFilter, stickers, texts]);

  const handleSend = async () => {
    setSending(true);
    try {
      const editedImageUrl = await renderToCanvas();
      onSend(editedImageUrl);
    } catch (error) {
      console.error('Failed to render snap:', error);
      toast.error('Failed to process snap');
      // Fallback to original image
      onSend(imageUrl);
    } finally {
      setSending(false);
    }
  };

  // Get CSS filter class for preview
  const getFilterClass = (filter: typeof FILTERS[0]) => {
    switch (filter.name) {
      case 'Vintage': return 'sepia';
      case 'B&W': return 'grayscale';
      case 'Warm': return 'saturate-150 hue-rotate-15';
      case 'Cool': return 'saturate-125 hue-rotate-180';
      case 'Fade': return 'contrast-75 brightness-110';
      case 'Vivid': return 'saturate-200 contrast-110';
      case 'Drama': return 'contrast-125 brightness-90';
      default: return '';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 safe-top">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={sending}>
          <X className="w-6 h-6 text-white" />
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            disabled={sending}
            onClick={() => {
              setStickers([]);
              setTexts([]);
              setSelectedFilter(FILTERS[0]);
            }}
          >
            <Undo className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Image with overlays */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <img 
          ref={imageRef}
          src={imageUrl} 
          alt="Snap"
          crossOrigin="anonymous"
          className={`w-full h-full object-contain ${getFilterClass(selectedFilter)}`}
        />
        
        {/* Stickers */}
        {stickers.map(sticker => (
          <motion.div
            key={sticker.id}
            drag
            dragMomentum={false}
            initial={{ scale: 0 }}
            animate={{ scale: sticker.scale, rotate: sticker.rotation }}
            className="absolute cursor-move select-none"
            style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: 'translate(-50%, -50%)' }}
            onDragEnd={(_, info) => {
              if (!containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const newX = ((info.point.x - rect.left) / rect.width) * 100;
              const newY = ((info.point.y - rect.top) / rect.height) * 100;
              setStickers(prev => prev.map(s => 
                s.id === sticker.id ? { ...s, x: newX, y: newY } : s
              ));
            }}
            onDoubleClick={() => removeSticker(sticker.id)}
          >
            <span className="text-5xl drop-shadow-lg">{sticker.emoji}</span>
          </motion.div>
        ))}

        {/* Text overlays */}
        {texts.map(text => (
          <motion.div
            key={text.id}
            drag
            dragMomentum={false}
            className="absolute cursor-move select-none"
            style={{ 
              left: `${text.x}%`, 
              top: `${text.y}%`, 
              transform: 'translate(-50%, -50%)',
              color: text.color,
              fontSize: text.size,
            }}
            onDragEnd={(_, info) => {
              if (!containerRef.current) return;
              const rect = containerRef.current.getBoundingClientRect();
              const newX = ((info.point.x - rect.left) / rect.width) * 100;
              const newY = ((info.point.y - rect.top) / rect.height) * 100;
              setTexts(prev => prev.map(t => 
                t.id === text.id ? { ...t, x: newX, y: newY } : t
              ));
            }}
            onDoubleClick={() => removeText(text.id)}
          >
            <span className="font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {text.text}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Tool panels */}
      <AnimatePresence>
        {activeTab === 'stickers' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-24 left-0 right-0 bg-black/80 backdrop-blur-lg p-4 rounded-t-3xl"
          >
            <p className="text-xs text-white/60 mb-2 text-center">Double-tap sticker to remove</p>
            <div className="grid grid-cols-6 gap-3">
              {STICKERS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="text-3xl p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'filters' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-24 left-0 right-0 bg-black/80 backdrop-blur-lg p-4 rounded-t-3xl"
          >
            <div className="flex gap-3 overflow-x-auto pb-2">
              {FILTERS.map(filter => (
                <button 
                  key={filter.name}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2 p-2 rounded-xl transition-all ${
                    selectedFilter.name === filter.name ? 'bg-primary/30 ring-2 ring-primary' : 'hover:bg-white/10'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-lg overflow-hidden ${getFilterClass(filter)}`}>
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs text-white">{filter.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'text' && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-24 left-0 right-0 bg-black/80 backdrop-blur-lg p-4 rounded-t-3xl"
          >
            <p className="text-xs text-white/60 mb-2 text-center">Double-tap text to remove</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addText()}
                placeholder="Type your text..."
                className="flex-1 bg-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/50"
              />
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer"
              />
              <Button onClick={addText} size="icon" variant="neon" disabled={!newText.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom toolbar */}
      <div className="p-4 flex items-center justify-between bg-black/50 backdrop-blur-lg safe-bottom">
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'stickers' ? 'neon' : 'glass'}
            size="icon"
            disabled={sending}
            onClick={() => setActiveTab(activeTab === 'stickers' ? null : 'stickers')}
          >
            <Sticker className="w-5 h-5" />
          </Button>
          <Button 
            variant={activeTab === 'filters' ? 'neon' : 'glass'}
            size="icon"
            disabled={sending}
            onClick={() => setActiveTab(activeTab === 'filters' ? null : 'filters')}
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          <Button 
            variant={activeTab === 'text' ? 'neon' : 'glass'}
            size="icon"
            disabled={sending}
            onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')}
          >
            <Type className="w-5 h-5" />
          </Button>
        </div>
        
        <Button variant="neon" onClick={handleSend} disabled={sending} className="gap-2 min-w-[100px]">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Send
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default SnapEditor;
