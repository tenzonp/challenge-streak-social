import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { Message, useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatViewProps {
  friend: Profile;
  onBack: () => void;
  onViewProfile: (user: Profile) => void;
}

const ChatView = ({ friend, onBack, onViewProfile }: ChatViewProps) => {
  const { user } = useAuth();
  const { sendMessage, getMessages } = useMessages();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    const msgs = await getMessages(friend.user_id);
    setMessages(msgs);
  };

  useEffect(() => {
    fetchMessages();
  }, [friend.user_id]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header with input */}
      <div 
        className="border-b border-border/50 safe-top"
        style={{
          background: `linear-gradient(135deg, ${friend.color_primary || '#4ade80'}15, ${friend.color_secondary || '#f472b6'}15)`
        }}
      >
        <div className="flex items-center gap-3 p-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <button 
            onClick={() => onViewProfile(friend)}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <img 
              src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
              className="w-10 h-10 rounded-xl shrink-0"
              style={{ borderColor: friend.color_primary || undefined, borderWidth: friend.color_primary ? 2 : 0 }}
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold truncate">{friend.display_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {friend.vibe && <span className="truncate">{friend.vibe}</span>}
                {friend.current_song && (
                  <span className="flex items-center gap-1 truncate">
                    <Music className="w-3 h-3" />
                    {friend.current_song}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Input bar in header */}
        <div className="px-3 pb-3">
          <div className="flex gap-2 items-center bg-background/50 rounded-2xl p-1.5 border border-border/50">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`message ${friend.display_name}...`}
              className="flex-1 px-3 py-2 bg-transparent outline-none text-sm"
              maxLength={500}
            />
            <Button 
              variant="neon" 
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-xl px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${friend.color_primary || '#4ade80'}, ${friend.color_secondary || '#f472b6'})` }}
            >
              <span className="text-2xl">👋</span>
            </div>
            <p className="text-muted-foreground mb-1">no messages yet</p>
            <p className="text-sm text-muted-foreground">say hi to {friend.display_name}!</p>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                {date}
              </span>
            </div>
            <div className="space-y-2">
              {msgs.map((msg) => {
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
                        "max-w-[80%] px-4 py-2.5 rounded-2xl",
                        isMe 
                          ? "rounded-br-sm" 
                          : "rounded-bl-sm bg-muted"
                      )}
                      style={isMe ? {
                        background: `linear-gradient(135deg, ${friend.color_primary || 'hsl(var(--primary))'}, ${friend.color_secondary || 'hsl(var(--secondary))'})`,
                        color: 'white'
                      } : undefined}
                    >
                      <p className="break-words text-[15px]">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1 opacity-70",
                        isMe ? "text-right" : ""
                      )}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatView;
