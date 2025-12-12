import { useRef, useState } from 'react';
import { Download, Share2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
      canvas.width = 1080;
      canvas.height = 1350;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, post.user?.color_primary || '#4ade80');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load main photo
      const mainPhoto = await loadImage(post.back_photo_url);
      const selfiePhoto = await loadImage(post.front_photo_url);

      // Draw main photo with rounded corners effect
      ctx.save();
      roundedRect(ctx, 40, 40, canvas.width - 80, 900, 40);
      ctx.clip();
      ctx.drawImage(mainPhoto, 40, 40, canvas.width - 80, 900);
      ctx.restore();

      // Draw selfie overlay
      ctx.save();
      roundedRect(ctx, 60, 60, 180, 240, 20);
      ctx.clip();
      ctx.drawImage(selfiePhoto, 60, 60, 180, 240);
      ctx.restore();

      // Border for selfie
      ctx.strokeStyle = post.user?.color_primary || '#4ade80';
      ctx.lineWidth = 4;
      roundedRect(ctx, 60, 60, 180, 240, 20);
      ctx.stroke();

      // User info section
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      roundedRect(ctx, 40, 960, canvas.width - 80, 350, 30);
      ctx.fill();

      // Username
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px system-ui';
      ctx.fillText(post.user?.display_name || 'User', 80, 1030);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '32px system-ui';
      ctx.fillText(`@${post.user?.username}`, 80, 1080);

      // Caption
      if (post.caption) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '36px system-ui';
        const words = post.caption.split(' ');
        let line = '';
        let y = 1150;
        words.forEach(word => {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > canvas.width - 160) {
            ctx.fillText(line, 80, y);
            line = word + ' ';
            y += 45;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, 80, y);
      }

      // Streak badge
      if (post.user?.streak && post.user.streak > 0) {
        ctx.fillStyle = post.user?.color_primary || '#4ade80';
        ctx.font = 'bold 32px system-ui';
        ctx.fillText(`🔥 ${post.user.streak} day streak`, 80, 1250);
      }

      // Watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '24px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('woup ✨', canvas.width - 60, 1300);

      const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
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
      // Convert base64 to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();

      // Check if share API is available with files
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], 'woup-post.jpg', { type: 'image/jpeg' })] })) {
        await navigator.share({
          files: [new File([blob], 'woup-post.jpg', { type: 'image/jpeg' })],
          title: 'Woup Post',
          text: post.caption || 'Check out my woup! ✨',
        });
        toast.success('Shared successfully! 🎉');
      } else {
        // Fallback: download the image
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `woup-${post.id.slice(0, 8)}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Saved to downloads! 📸');
      }
    } catch (error) {
      console.error('Share error:', error);
      // Fallback download
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `woup-${post.id.slice(0, 8)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Saved to downloads! 📸');
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