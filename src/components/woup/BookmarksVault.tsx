import { Lock, Bookmark, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookmarks } from '@/hooks/useBookmarks';
import { toast } from 'sonner';

interface BookmarksVaultProps {
  onClose: () => void;
  onViewPost?: (post: any) => void;
}

const BookmarksVault = ({ onClose, onViewPost }: BookmarksVaultProps) => {
  const { bookmarks, loading, removeBookmark } = useBookmarks();

  const handleRemove = async (responseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeBookmark(responseId);
    toast.success('Removed from vault');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Header */}
      <div className="border-b border-border/30 p-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Your Vault</h1>
              <p className="text-xs text-muted-foreground">{bookmarks.length} saved posts</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto h-[calc(100vh-80px)] safe-bottom">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 rounded-3xl gradient-primary mx-auto mb-4 flex items-center justify-center"
            >
              <Bookmark className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h3 className="font-bold text-lg mb-2">Your vault is empty</h3>
            <p className="text-muted-foreground text-sm">
              Save posts by tapping the bookmark icon ✨
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {bookmarks.map((bookmark, index) => (
                <motion.div
                  key={bookmark.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer"
                  onClick={() => onViewPost?.(bookmark.response)}
                >
                  <img
                    src={bookmark.response?.back_photo_url}
                    alt="Saved post"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Mini selfie */}
                  <div 
                    className="absolute top-2 left-2 w-10 h-14 rounded-lg overflow-hidden border-2"
                    style={{ borderColor: bookmark.response?.user?.color_primary || 'hsl(var(--primary))' }}
                  >
                    <img 
                      src={bookmark.response?.front_photo_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* User info */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-bold truncate drop-shadow-lg">
                      {bookmark.response?.user?.display_name}
                    </p>
                    <p className="text-white/70 text-xs truncate">
                      @{bookmark.response?.user?.username}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={(e) => handleRemove(bookmark.response_id, e)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BookmarksVault;