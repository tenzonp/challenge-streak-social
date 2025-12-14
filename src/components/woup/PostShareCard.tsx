import { useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { saveImageToGallery } from '@/utils/nativeDownload';

interface PostShareCardProps {
  post: {
    id: string;
    front_photo_url: string;
    back_photo_url: string;
    caption?: string | null;
    created_at: string;
    user?: {
      display_name: string;
      username: string;
      avatar_url?: string | null;
      color_primary?: string | null;
      streak?: number;
    };
  };
  onClose: () => void;
}

const PostShareCard = ({ post, onClose }: PostShareCardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generatePostcard = async () => {
    setIsGenerating(true);

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Postcard dimensions
      // Use original image dimensions for high quality
      const mainPhoto = await loadImage(post.back_photo_url);
      const selfiePhoto = await loadImage(post.front_photo_url);
      
      // Calculate canvas size based on main photo (max 1080 width, maintain aspect)
      const maxWidth = 1080;
      const aspectRatio = mainPhoto.height / mainPhoto.width;
      canvas.width = Math.min(mainPhoto.width, maxWidth);
      canvas.height = Math.round(canvas.width * aspectRatio) + 300; // Extra space for info

      // Draw main photo at full quality (no compression)
      ctx.drawImage(mainPhoto, 0, 0, canvas.width, canvas.height - 300);

      // Draw selfie overlay at original quality
      const selfieWidth = Math.round(canvas.width * 0.18);
      const selfieHeight = Math.round(selfieWidth * 1.33);
      ctx.save();
      roundedRect(ctx, 20, 20, selfieWidth, selfieHeight, 16);
      ctx.clip();
      ctx.drawImage(selfiePhoto, 20, 20, selfieWidth, selfieHeight);
      ctx.restore();

      // Border for selfie
      ctx.strokeStyle = post.user?.color_primary || '#4ade80';
      ctx.lineWidth = 4;
      roundedRect(ctx, 20, 20, selfieWidth, selfieHeight, 16);
      ctx.stroke();

      // User info section at bottom
      const infoY = canvas.height - 300;
      const gradient = ctx.createLinearGradient(0, infoY, 0, canvas.height);
      gradient.addColorStop(0, post.user?.color_primary || '#4ade80');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, infoY, canvas.width, 300);

      // Username
      const fontSize = Math.round(canvas.width * 0.044);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px system-ui`;
      ctx.fillText(post.user?.display_name || 'User', 30, infoY + 60);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = `${Math.round(fontSize * 0.7)}px system-ui`;
      ctx.fillText(`@${post.user?.username}`, 30, infoY + 100);

      // Caption
      if (post.caption) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.round(fontSize * 0.8)}px system-ui`;
        const words = post.caption.split(' ');
        let line = '';
        let y = infoY + 150;
        const captionMaxWidth = canvas.width - 60;
        words.forEach(word => {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > captionMaxWidth) {
            ctx.fillText(line, 30, y);
            line = word + ' ';
            y += Math.round(fontSize * 1.1);
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, 30, y);
      }

      // Streak badge
      if (post.user?.streak && post.user.streak > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(fontSize * 0.7)}px system-ui`;
        ctx.fillText(`🔥 ${post.user.streak} day streak`, 30, canvas.height - 40);
      }

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${Math.round(fontSize * 0.6)}px system-ui`;
      ctx.textAlign = 'right';
      ctx.fillText('woup ✨', canvas.width - 30, canvas.height - 40);
      ctx.textAlign = 'left';

      // Export at maximum quality (PNG = no compression)
      const imageUrl = canvas.toDataURL('image/png');
      setGeneratedImage(imageUrl);
    } catch (error) {
      console.error('Error generating postcard:', error);
      toast.error('Failed to generate postcard');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const saveToGallery = async () => {
    if (!generatedImage) return;

    try {
      const filename = `woup-${post.id.slice(0, 8)}.png`;
      
      // Try native save first, then web share, then download
      const saved = await saveImageToGallery(generatedImage, filename);
      
      if (!saved) {
        // Fallback to web share API
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        
        if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
          await navigator.share({
            files: [new File([blob], filename, { type: 'image/png' })],
            title: 'Woup Post',
            text: post.caption || 'Check out my woup!',
          });
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to save');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-3xl p-6 max-w-sm w-full space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Share as Image</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {!generatedImage ? (
          <div className="space-y-4">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden relative">
              <img src={post.back_photo_url} alt="Post" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 w-14 h-20 rounded-xl overflow-hidden border-2"
                style={{ borderColor: post.user?.color_primary || 'hsl(var(--primary))' }}>
                <img src={post.front_photo_url} alt="Selfie" className="w-full h-full object-cover" />
              </div>
            </div>
            
            <Button 
              variant="neon" 
              className="w-full"
              onClick={generatePostcard}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Generate Postcard
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden">
              <img src={generatedImage} alt="Postcard" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="glass" 
                className="flex-1"
                onClick={() => setGeneratedImage(null)}
              >
                Regenerate
              </Button>
              <Button 
                variant="neon" 
                className="flex-1"
                onClick={saveToGallery}
              >
                <Download className="w-4 h-4 mr-2" />
                Save & Share
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PostShareCard;