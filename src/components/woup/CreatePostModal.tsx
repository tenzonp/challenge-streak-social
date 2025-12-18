import { useState } from 'react';
import { X, Image, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePosts } from '@/hooks/usePosts';
import { useCamera } from '@/hooks/useCamera';
import { compressImageFile } from '@/utils/imageCompression';

interface CreatePostModalProps {
  onClose: () => void;
}

const CreatePostModal = ({ onClose }: CreatePostModalProps) => {
  const { createPost } = usePosts();
  const { uploadPhoto } = useCamera();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image immediately for preview and faster upload
      const { dataUrl } = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1600,
        quality: 0.8,
      });
      setImagePreview(dataUrl);
    } catch {
      // Fallback to original
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imagePreview) {
      toast({
        title: 'add something!',
        description: 'write something or add an image',
        variant: 'destructive',
      });
      return;
    }

    setPosting(true);
    
    let imageUrl: string | undefined;
    if (imagePreview) {
      imageUrl = await uploadPhoto(imagePreview, 'back') || undefined;
    }

    const { error } = await createPost(content, imageUrl);

    if (error) {
      toast({
        title: 'failed to post',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'posted! 🎉' });
      onClose();
    }
    
    setPosting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass rounded-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">new post ✨</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="what's on your mind?"
          className="w-full h-32 p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none resize-none"
          maxLength={500}
        />

        {imagePreview && (
          <div className="relative mt-4">
            <img 
              src={imagePreview} 
              className="w-full h-48 object-cover rounded-2xl"
            />
            <button 
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <label className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
              <Image className="w-5 h-5" />
              <span className="text-sm">add photo</span>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageSelect}
            />
          </label>

          <Button variant="neon" onClick={handlePost} disabled={posting} className="gap-2">
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            post
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
