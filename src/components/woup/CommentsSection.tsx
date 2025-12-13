import { useState, useEffect } from 'react';
import { Heart, Reply, Trash2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useComments, Comment } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CommentsSectionProps {
  responseId: string;
  onClose: () => void;
}

const CommentItem = ({ 
  comment, 
  onReply, 
  onLike, 
  onDelete,
  currentUserId,
  depth = 0 
}: { 
  comment: Comment; 
  onReply: (id: string, username: string) => void;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
  depth?: number;
}) => {
  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("py-3", depth > 0 && "ml-10 border-l-2 border-border/30 pl-4")}
    >
      <div className="flex gap-3">
        <img
          src={comment.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`}
          alt={comment.user?.display_name || 'User'}
          className="w-8 h-8 rounded-xl shrink-0"
          style={{ borderColor: comment.user?.color_primary || 'transparent', borderWidth: 2 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{comment.user?.username || 'user'}</span>
            <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
          </div>
          <p className="text-sm mt-0.5 break-words">{comment.content}</p>
          
          <div className="flex items-center gap-4 mt-2">
            <button 
              onClick={() => onLike(comment.id)}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                comment.isLiked ? "text-secondary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", comment.isLiked && "fill-current")} />
              {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
            </button>
            
            {depth < 2 && (
              <button 
                onClick={() => onReply(comment.id, comment.user?.username || 'user')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Reply className="w-3.5 h-3.5" />
                Reply
              </button>
            )}
            
            {currentUserId === comment.user_id && (
              <button 
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const CommentsSection = ({ responseId, onClose }: CommentsSectionProps) => {
  const { user } = useAuth();
  const { comments, loading, fetchComments, addComment, toggleLike, deleteComment } = useComments(responseId);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!input.trim() || sending) return;
    
    setSending(true);
    const { error } = await addComment(input.trim(), replyTo?.id);
    
    if (!error) {
      setInput('');
      setReplyTo(null);
    }
    setSending(false);
  };

  const handleReply = (id: string, username: string) => {
    setReplyTo({ id, username });
    setInput(`@${username} `);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="font-bold text-lg">Comments</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No comments yet</p>
              <p className="text-sm mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReply={handleReply}
                  onLike={toggleLike}
                  onDelete={deleteComment}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reply indicator */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-2 bg-muted/30 border-t border-border/30"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Replying to <span className="font-medium text-foreground">@{replyTo.username}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setReplyTo(null); setInput(''); }}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-4 border-t border-border/30 safe-bottom">
          <div className="flex items-center gap-2 bg-muted/50 rounded-2xl p-1.5">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
              maxLength={500}
            />
            <Button
              variant="neon"
              size="sm"
              onClick={handleSubmit}
              disabled={!input.trim() || sending}
              className="rounded-xl px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CommentsSection;
