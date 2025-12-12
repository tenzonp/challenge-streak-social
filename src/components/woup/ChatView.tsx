import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { Message, useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  friend: Profile;
  onBack: () => void;
}

const ChatView = ({ friend, onBack }: ChatViewProps) => {
  const { user } = useAuth();
  const { sendMessage, getMessages } = useMessages();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const msgs = await getMessages(friend.user_id);
    setMessages(msgs);
  };

  useEffect(() => {
    fetchMessages();
  }, [friend.user_id]);

  // Realtime subscription for this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${friend.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (
            (newMsg.sender_id === friend.user_id && newMsg.receiver_id === user?.id) ||
            (newMsg.sender_id === user?.id && newMsg.receiver_id === friend.user_id)
          ) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend.user_id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    const { error } = await sendMessage(friend.user_id, input.trim());
    if (!error) {
      setInput('');
    }
    setSending(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="glass border-b border-border/50 p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <img 
          src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
          className="w-10 h-10 rounded-xl"
          style={{ borderColor: friend.color_primary || undefined, borderWidth: friend.color_primary ? 2 : 0 }}
        />
        <div className="flex-1">
          <p className="font-semibold">{friend.display_name}</p>
          {friend.vibe && <p className="text-xs text-muted-foreground">{friend.vibe}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p>no messages yet</p>
            <p className="text-sm">say hi! 👋</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                isMe ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2 rounded-2xl",
                  isMe 
                    ? "gradient-primary text-primary-foreground rounded-br-md" 
                    : "bg-muted rounded-bl-md"
                )}
              >
                <p className="break-words">{msg.content}</p>
                <p className={cn(
                  "text-xs mt-1",
                  isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-border/50 p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="type a message..."
            className="flex-1 p-3 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none"
            maxLength={500}
          />
          <Button 
            variant="neon" 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
