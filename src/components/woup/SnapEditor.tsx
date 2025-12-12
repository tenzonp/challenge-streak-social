import { useState, useRef, useEffect } from 'react';
import { X, Send, Sticker, Sparkles, Type, Palette, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface SnapEditorProps {
  imageUrl: string;
  onSend: (editedImageUrl: string) => void;
  onClose: () => void;
}

const STICKERS = ['🔥', '💯', '😍', '🎉', '✨', '💀', '😂', '❤️', '🙌', '👀', '🤯', '💅'];

const FILTERS = [
  { name: 'None', class: '' },
  { name: 'Vintage', class: 'sepia' },
  { name: 'B&W', class: 'grayscale' },
  { name: 'Warm', class: 'saturate-150 hue-rotate-15' },
  { name: 'Cool', class: 'saturate-125 hue-rotate-180' },
  { name: 'Fade', class: 'contrast-75 brightness-110' },
  { name: 'Vivid', class: 'saturate-200 contrast-110' },
  { name: 'Drama', class: 'contrast-125 brightness-90' },
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    // For now, just send the original image with filter class
    // In production, you'd render to canvas and export
    onSend(imageUrl);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-6 h-6 text-white" />
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
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
          src={imageUrl} 
          alt="Snap"
          className={`w-full h-full object-contain ${selectedFilter.class}`}
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
            <div className="grid grid-cols-6 gap-3">
              {STICKERS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => addSticker(emoji)}
                  className="text-3xl p-2 rounded-xl hover:bg-white/10 transition-colors"
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
                  <div className={`w-16 h-16 rounded-lg overflow-hidden ${filter.class}`}>
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
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Type your text..."
                className="flex-1 bg-white/10 rounded-xl px-4 py-2 text-white placeholder:text-white/50"
              />
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer"
              />
              <Button onClick={addText} size="icon" variant="neon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom toolbar */}
      <div className="p-4 flex items-center justify-between bg-black/50 backdrop-blur-lg">
        <div className="flex gap-2">
          <Button 
            variant={activeTab === 'stickers' ? 'neon' : 'glass'}
            size="icon"
            onClick={() => setActiveTab(activeTab === 'stickers' ? null : 'stickers')}
          >
            <Sticker className="w-5 h-5" />
          </Button>
          <Button 
            variant={activeTab === 'filters' ? 'neon' : 'glass'}
            size="icon"
            onClick={() => setActiveTab(activeTab === 'filters' ? null : 'filters')}
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          <Button 
            variant={activeTab === 'text' ? 'neon' : 'glass'}
            size="icon"
            onClick={() => setActiveTab(activeTab === 'text' ? null : 'text')}
          >
            <Type className="w-5 h-5" />
          </Button>
        </div>
        
        <Button variant="neon" onClick={handleSend} className="gap-2">
          <Send className="w-4 h-4" /> Send
        </Button>
      </div>
    </motion.div>
  );
};

export default SnapEditor;
