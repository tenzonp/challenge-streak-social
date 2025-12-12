import { useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/hooks/useProfile';

interface SendChallengeModalProps {
  friend: Profile;
  onClose: () => void;
  onSend: (friendId: string, challenge: string) => Promise<{ error: Error | null }>;
}

const quickChallenges = [
  "show me ur view rn 🌅",
  "what r u eating? 🍕",
  "ur outfit today? 👗",
  "show ur workspace 💻",
  "what r u listening to? 🎵",
  "ur mood rn? 😊",
];

const SendChallengeModal = ({ friend, onClose, onSend }: SendChallengeModalProps) => {
  const [challenge, setChallenge] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!challenge.trim()) {
      toast({
        title: "write something!",
        description: "challenge can't be empty 😅",
        variant: "destructive",
      });
      return;
    }
    
    setSending(true);
    const { error } = await onSend(friend.user_id, challenge);
    setSending(false);

    if (error) {
      toast({
        title: "failed to send",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "challenge sent! 🚀",
      description: `${friend.display_name} has 1 hour to respond`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass rounded-3xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img 
              src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`} 
              alt={friend.display_name}
              className="w-12 h-12 rounded-2xl border-2 border-secondary/50"
            />
            <div>
              <h3 className="font-semibold">challenge {friend.display_name}</h3>
              <p className="text-sm text-muted-foreground">they have 1 hour ⏰</p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Input */}
        <div className="relative mb-4">
          <textarea
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            placeholder="what do u wanna see? ✨"
            className="w-full h-24 p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none text-foreground placeholder:text-muted-foreground outline-none transition-all"
            maxLength={100}
          />
          <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {challenge.length}/100
          </span>
        </div>
        
        {/* Quick challenges */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            quick picks
          </p>
          <div className="flex flex-wrap gap-2">
            {quickChallenges.map((q, i) => (
              <button
                key={i}
                onClick={() => setChallenge(q)}
                className="px-3 py-1.5 rounded-full bg-muted/50 text-sm hover:bg-muted transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        
        {/* Send button */}
        <Button 
          variant="neon" 
          className="w-full gap-2"
          onClick={handleSend}
          disabled={sending}
        >
          <Send className="w-4 h-4" />
          {sending ? 'sending...' : 'send challenge'}
        </Button>
      </div>
    </div>
  );
};

export default SendChallengeModal;
