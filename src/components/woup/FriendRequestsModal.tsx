import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, XIcon, Clock, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { FriendRequest } from '@/hooks/useFriends';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface FriendRequestsModalProps {
  requests: FriendRequest[];
  onClose: () => void;
  onAccept: (requestId: string, requesterId: string) => Promise<{ error: Error | null }>;
  onDecline: (requestId: string) => Promise<{ error: Error | null }>;
  onViewProfile: (user: Profile) => void;
}

const FriendRequestsModal = ({ 
  requests, 
  onClose, 
  onAccept, 
  onDecline, 
  onViewProfile 
}: FriendRequestsModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAccept = async (request: FriendRequest) => {
    setLoading(request.id);
    const { error } = await onAccept(request.id, request.user_id);
    if (!error) {
      toast({ title: `You're now friends with ${request.requester.display_name}! 🎉` });
    }
    setLoading(null);
  };

  const handleDecline = async (request: FriendRequest) => {
    setLoading(request.id);
    const { error } = await onDecline(request.id);
    if (!error) {
      toast({ title: 'Request declined' });
    }
    setLoading(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-background/90 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="relative w-full max-w-md max-h-[80vh] glass rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Friend Requests</h2>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                {requests.length}
              </span>
            )}
          </div>
          <Button variant="glass" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Requests list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <AnimatePresence>
              {requests.map(request => (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="glass rounded-2xl p-4 flex items-center gap-4"
                >
                  <button 
                    onClick={() => onViewProfile(request.requester)}
                    className="flex items-center gap-4 flex-1 text-left"
                  >
                    <img
                      src={request.requester.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${request.requester.user_id}`}
                      alt={request.requester.display_name}
                      className="w-14 h-14 rounded-2xl object-cover"
                      style={{
                        border: `3px solid ${request.requester.color_primary || 'hsl(var(--primary))'}`
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{request.requester.display_name}</p>
                      <p className="text-sm text-muted-foreground truncate">@{request.requester.username}</p>
                      {request.requester.vibe && (
                        <p className="text-xs text-primary mt-1">{request.requester.vibe}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleAccept(request)}
                      disabled={loading === request.id}
                      className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-cyan text-background flex items-center justify-center"
                    >
                      <Check className="w-5 h-5" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDecline(request)}
                      disabled={loading === request.id}
                      className="w-10 h-10 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30 transition-colors"
                    >
                      <XIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FriendRequestsModal;
