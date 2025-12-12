import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Music, Mic, Camera, Video, X, Play, Pause, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { Message, useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatViewProps {
  friend: Profile;
  onBack: () => void;
  onViewProfile: (user: Profile) => void;
  onVideoCall?: (friend: Profile) => void;
}

const ChatView = ({ friend, onBack, onViewProfile, onVideoCall }: ChatViewProps) => {
  const { user } = useAuth();
  const { sendMessage, getMessages } = useMessages();
  const { isRecording, duration, startRecording, stopRecording, cancelRecording, uploadAudio, formatDuration } = useAudioRecorder();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any;
        if ((newMsg.sender_id === friend.user_id && newMsg.receiver_id === user?.id) ||
            (newMsg.sender_id === user?.id && newMsg.receiver_id === friend.user_id)) {
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [friend.user_id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    await sendMessage(friend.user_id, input.trim());
    setInput('');
    setSending(false);
  };

  const handleSendAudio = async () => {
    if (!user) return;
    const result = await stopRecording();
    if (result) {
      setSending(true);
      const url = await uploadAudio(result.blob, user.id);
      if (url) {
        // For now, send as text with audio indicator
        await sendMessage(friend.user_id, `🎵 Voice message (${formatDuration(result.duration)})`);
      }
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {} as Record<string, Message[]>);

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Spicy Header */}
      <div className="border-b border-border/30 safe-top"
        style={{ background: `linear-gradient(135deg, ${friend.color_primary || '#4ade80'}20, ${friend.color_secondary || '#f472b6'}20)` }}>
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <button onClick={() => onViewProfile(friend)} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <img src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.user_id}`}
                className="w-11 h-11 rounded-2xl" style={{ borderColor: friend.color_primary, borderWidth: 2 }} />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-background" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-bold truncate">{friend.display_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {friend.current_song && <span className="flex items-center gap-1 truncate"><Music className="w-3 h-3 text-primary" />{friend.current_song}</span>}
                {!friend.current_song && friend.vibe && <span className="truncate">{friend.vibe}</span>}
              </div>
            </div>
          </button>

          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onVideoCall?.(friend)}>
            <Video className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
              className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${friend.color_primary}, ${friend.color_secondary})` }}>
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <p className="text-muted-foreground mb-1">start vibing with</p>
            <p className="font-bold text-lg">{friend.display_name} ✨</p>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1 rounded-full glass text-xs font-medium">{date}</span>
            </div>
            <div className="space-y-2">
              {msgs.map((msg, i) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] px-4 py-2.5 rounded-3xl", isMe ? "rounded-br-lg" : "rounded-bl-lg bg-muted/80")}
                      style={isMe ? { background: `linear-gradient(135deg, ${friend.color_primary || 'hsl(var(--primary))'}, ${friend.color_secondary || 'hsl(var(--secondary))'})`, color: 'white' } : undefined}>
                      <p className="break-words text-[15px]">{msg.content}</p>
                      <p className={cn("text-[10px] mt-1 opacity-60", isMe && "text-right")}>{formatTime(msg.created_at)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-border/30 safe-bottom" style={{ background: `linear-gradient(0deg, ${friend.color_primary || '#4ade80'}08, transparent)` }}>
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div key="recording" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="flex items-center gap-3 p-2 rounded-2xl glass">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={cancelRecording}><X className="w-5 h-5" /></Button>
              <div className="flex-1 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="font-mono text-sm">{formatDuration(duration)}</span>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div className="h-full bg-destructive" animate={{ width: ['0%', '100%'] }} transition={{ duration: 60, ease: 'linear' }} />
                </div>
              </div>
              <Button variant="neon" size="icon" className="rounded-full" onClick={handleSendAudio}><Send className="w-5 h-5" /></Button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={startRecording}><Mic className="w-5 h-5" /></Button>
              <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-2xl p-1.5 border border-border/30">
                <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`message ${friend.display_name.split(' ')[0]}...`} className="flex-1 px-3 py-2 bg-transparent outline-none text-sm" maxLength={500} />
                <Button variant="neon" size="sm" onClick={handleSend} disabled={!input.trim() || sending} className="rounded-xl px-4"><Send className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ChatView;
