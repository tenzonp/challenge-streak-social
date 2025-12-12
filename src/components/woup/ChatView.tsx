import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Music, Mic, Camera, Video, X, Lock, Sparkles, Check, CheckCheck, Eye, Play, Pause, Image as ImageIcon, Reply, Trash2, Flag, MoreVertical, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';
import { Message, MessageReaction, useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatLockScreen, ChatLockSettings, useChatLock } from './ChatLock';
import SnapEditor from './SnapEditor';
import TypingIndicator from './TypingIndicator';
import ARFaceFilters from './ARFaceFilters';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatViewProps {
  friend: Profile;
  onBack: () => void;
  onViewProfile: (user: Profile) => void;
  onVideoCall?: (friend: Profile) => void;
}

const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

// Status indicator component
const MessageStatus = ({ status, isMe }: { status: string; isMe: boolean }) => {
  if (!isMe) return null;
  
  return (
    <span className="ml-1 inline-flex">
      {status === 'sent' && <Check className="w-3 h-3 opacity-60" />}
      {status === 'delivered' && <CheckCheck className="w-3 h-3 opacity-60" />}
      {status === 'read' && <CheckCheck className="w-3 h-3 text-primary" />}
    </span>
  );
};

// Message reactions display
const MessageReactions = ({ 
  reactions, 
  onToggle,
  messageId 
}: { 
  reactions: MessageReaction[]; 
  onToggle: (emoji: string) => void;
  messageId: string;
}) => {
  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button
          key={`${messageId}-${emoji}`}
          onClick={() => onToggle(emoji)}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-muted/50 text-xs hover:bg-muted transition-colors"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </button>
      ))}
    </div>
  );
};

// Snap message component
const SnapMessage = ({ 
  message, 
  isMe, 
  onView, 
  colorPrimary, 
  colorSecondary 
}: { 
  message: Message; 
  isMe: boolean; 
  onView: () => void;
  colorPrimary?: string;
  colorSecondary?: string;
}) => {
  const [viewing, setViewing] = useState(false);
  const viewsLeft = message.snap_views_remaining ?? 0;
  const canView = viewsLeft > 0;

  const handleView = () => {
    if (!canView) return;
    if (isMe) {
      // Sender can always view their sent snap
      setViewing(true);
      return;
    }
    setViewing(true);
    onView();
    setTimeout(() => setViewing(false), 5000);
  };

  if (viewing && message.media_url) {
    return (
      <motion.div 
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onClick={() => setViewing(false)}
      >
        <img src={message.media_url} alt="Snap" className="max-w-full max-h-full object-contain" />
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-sm">
          {isMe ? `${viewsLeft} views left` : `${viewsLeft - 1} views left`}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 text-white"
          onClick={() => setViewing(false)}
        >
          <X className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      whileTap={canView ? { scale: 0.95 } : undefined}
      onClick={handleView}
      className={cn(
        "relative w-32 h-44 rounded-2xl overflow-hidden cursor-pointer",
        !canView && "opacity-50"
      )}
      style={{ 
        background: isMe 
          ? `linear-gradient(135deg, ${colorPrimary || 'hsl(var(--primary))'}, ${colorSecondary || 'hsl(var(--secondary))'})` 
          : 'hsl(var(--muted))' 
      }}
    >
      {message.media_url ? (
        <img src={message.media_url} alt="Snap" className="w-full h-full object-cover blur-xl" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-8 h-8 opacity-50" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
        <Eye className="w-8 h-8 text-white mb-2" />
        <span className="text-white text-sm font-bold">
          {isMe ? `${viewsLeft} views left` : canView ? 'Tap to view' : 'Expired'}
        </span>
      </div>
    </motion.div>
  );
};

// Voice message component
const VoiceMessage = ({ 
  message, 
  isMe,
  colorPrimary,
  colorSecondary
}: { 
  message: Message; 
  isMe: boolean;
  colorPrimary?: string;
  colorSecondary?: string;
}) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!message.media_url) {
      toast.error('Audio not available');
      return;
    }
    
    if (!audioRef.current) {
      audioRef.current = new Audio(message.media_url);
      audioRef.current.onended = () => {
        setPlaying(false);
        setProgress(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
    }

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-3xl min-w-[180px]",
        isMe ? "rounded-br-lg" : "rounded-bl-lg bg-muted/80"
      )}
      style={isMe ? { 
        background: `linear-gradient(135deg, ${colorPrimary || 'hsl(var(--primary))'}, ${colorSecondary || 'hsl(var(--secondary))'})`,
        color: 'white' 
      } : undefined}
    >
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-full w-10 h-10 shrink-0 bg-white/20"
        onClick={togglePlay}
      >
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </Button>
      <div className="flex-1">
        <div className="h-1.5 rounded-full bg-white/30 overflow-hidden">
          <motion.div 
            className="h-full bg-white/80" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs opacity-70 mt-1 block">
          {message.audio_duration ? formatDuration(message.audio_duration) : '0:00'}
        </span>
      </div>
    </div>
  );
};

// Reaction picker popup
const ReactionPicker = ({ 
  onSelect, 
  onClose 
}: { 
  onSelect: (emoji: string) => void; 
  onClose: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="absolute bottom-full mb-2 left-0 flex gap-1 p-2 rounded-2xl glass shadow-lg z-10"
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="text-xl hover:scale-125 transition-transform p-1"
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
};

const ChatView = ({ friend, onBack, onViewProfile, onVideoCall }: ChatViewProps) => {
  const { user } = useAuth();
  const { sendMessage, getMessages, decrementSnapViews, deleteMessage, deleteAllChat, reportMessage, addReaction, removeReaction } = useMessages();
  const { isRecording, duration, startRecording, stopRecording, cancelRecording, uploadAudio, formatDuration } = useAudioRecorder();
  const { isLocked, hasPassword } = useChatLock(friend.user_id);
  const { isPartnerTyping, handleTyping, stopTyping } = useTypingIndicator(friend.user_id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showLockSettings, setShowLockSettings] = useState(false);
  const [snapImage, setSnapImage] = useState<string | null>(null);
  const [showARCamera, setShowARCamera] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (payload.eventType === 'INSERT') {
          if ((newMsg.sender_id === friend.user_id && newMsg.receiver_id === user?.id) ||
              (newMsg.sender_id === user?.id && newMsg.receiver_id === friend.user_id)) {
            fetchMessages();
          }
        } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
          fetchMessages();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [friend.user_id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    stopTyping();
    setSending(true);
    await sendMessage(friend.user_id, input.trim(), 'text', undefined, undefined, replyTo?.id);
    setInput('');
    setReplyTo(null);
    setSending(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    handleTyping();
  };

  const handleSendAudio = async () => {
    if (!user) return;
    const result = await stopRecording();
    if (result) {
      setSending(true);
      const url = await uploadAudio(result.blob, user.id);
      if (url) {
        await sendMessage(friend.user_id, '🎵 Voice message', 'voice', url, Math.round(result.duration), replyTo?.id);
      }
      setReplyTo(null);
      setSending(false);
    }
  };

  const handleARCapture = (imageUrl: string) => {
    setShowARCamera(false);
    setSnapImage(imageUrl);
  };

  const handleSendSnap = async (editedUrl: string) => {
    if (!user) return;
    try {
      const response = await fetch(editedUrl);
      const blob = await response.blob();
      const fileName = `snaps/${user.id}/${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('chat-media')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (error) {
        await sendMessage(friend.user_id, '📸 Sent a snap!', 'snap', undefined, undefined, replyTo?.id);
      } else {
        const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(fileName);
        await sendMessage(friend.user_id, '📸 Sent a snap!', 'snap', urlData.publicUrl, undefined, replyTo?.id);
      }
    } catch {
      await sendMessage(friend.user_id, '📸 Sent a snap!', 'snap', undefined, undefined, replyTo?.id);
    }
    setSnapImage(null);
    setReplyTo(null);
  };

  const handleViewSnap = async (messageId: string) => {
    const remaining = await decrementSnapViews(messageId);
    if (remaining === 0) {
      toast('Snap expired! 💨');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await deleteMessage(messageId);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } else {
      toast.error('Could not delete message');
    }
  };

  const handleReportMessage = async (messageId: string) => {
    await reportMessage(messageId);
    toast.success('Message reported');
  };

  const handleDeleteAllChat = async () => {
    await deleteAllChat(friend.user_id);
    setMessages([]);
    setShowDeleteAllDialog(false);
    toast.success('Your messages deleted');
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId);
    const hasReacted = msg?.reactions?.some(r => r.user_id === user?.id && r.emoji === emoji);
    
    if (hasReacted) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
    fetchMessages();
  };

  if (isLocked && !unlocked) {
    return <ChatLockScreen chatId={friend.user_id} onUnlock={() => setUnlocked(true)} />;
  }

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

  const renderMessage = (msg: Message, i: number) => {
    const isMe = msg.sender_id === user?.id;
    const messageType = msg.message_type || 'text';
    const replyToMsg = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

    return (
      <motion.div 
        key={msg.id} 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.02 }} 
        className={cn("flex group relative", isMe ? "justify-end" : "justify-start")}
      >
        <div className={cn("relative max-w-[80%]", isMe && "flex flex-col items-end")}>
          {/* Reply preview */}
          {replyToMsg && (
            <div className="text-xs px-3 py-1 mb-1 rounded-lg bg-muted/50 border-l-2 border-primary truncate max-w-full">
              <span className="opacity-60">↩</span> {replyToMsg.content.substring(0, 50)}
            </div>
          )}

          {/* Message actions */}
          <div className={cn(
            "absolute top-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            isMe ? "left-0 -translate-x-full pr-2" : "right-0 translate-x-full pl-2"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
            >
              <Smile className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
            >
              <Reply className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMe ? "end" : "start"}>
                {isMe && (
                  <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
                {!isMe && (
                  <DropdownMenuItem onClick={() => handleReportMessage(msg.id)}>
                    <Flag className="w-4 h-4 mr-2" /> Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reaction picker */}
          <AnimatePresence>
            {showReactionPicker === msg.id && (
              <ReactionPicker
                onSelect={(emoji) => handleToggleReaction(msg.id, emoji)}
                onClose={() => setShowReactionPicker(null)}
              />
            )}
          </AnimatePresence>

          {messageType === 'snap' ? (
            <div className="flex flex-col gap-1">
              <SnapMessage 
                message={msg} 
                isMe={isMe} 
                onView={() => handleViewSnap(msg.id)}
                colorPrimary={friend.color_primary || undefined}
                colorSecondary={friend.color_secondary || undefined}
              />
              <div className="flex items-center text-[10px] opacity-60 px-2">
                {formatTime(msg.created_at)}
                <MessageStatus status={msg.status || 'sent'} isMe={isMe} />
              </div>
              <MessageReactions 
                reactions={msg.reactions || []} 
                onToggle={(emoji) => handleToggleReaction(msg.id, emoji)}
                messageId={msg.id}
              />
            </div>
          ) : messageType === 'voice' ? (
            <div className="flex flex-col gap-1">
              <VoiceMessage 
                message={msg} 
                isMe={isMe}
                colorPrimary={friend.color_primary || undefined}
                colorSecondary={friend.color_secondary || undefined}
              />
              <div className={cn("flex items-center text-[10px] opacity-60 px-2", isMe && "justify-end")}>
                {formatTime(msg.created_at)}
                <MessageStatus status={msg.status || 'sent'} isMe={isMe} />
              </div>
              <MessageReactions 
                reactions={msg.reactions || []} 
                onToggle={(emoji) => handleToggleReaction(msg.id, emoji)}
                messageId={msg.id}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div 
                className={cn("px-4 py-2.5 rounded-3xl", isMe ? "rounded-br-lg" : "rounded-bl-lg bg-muted/80")}
                style={isMe ? { 
                  background: `linear-gradient(135deg, ${friend.color_primary || 'hsl(var(--primary))'}, ${friend.color_secondary || 'hsl(var(--secondary))'})`, 
                  color: 'white' 
                } : undefined}
              >
                <p className="break-words text-[15px]">{msg.content}</p>
                <div className={cn("flex items-center text-[10px] mt-1 opacity-60", isMe && "justify-end")}>
                  {formatTime(msg.created_at)}
                  <MessageStatus status={msg.status || 'sent'} isMe={isMe} />
                </div>
              </div>
              <MessageReactions 
                reactions={msg.reactions || []} 
                onToggle={(emoji) => handleToggleReaction(msg.id, emoji)}
                messageId={msg.id}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ x: '100%' }} 
      animate={{ x: 0 }} 
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
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

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowLockSettings(true)}>
                  <Lock className="w-4 h-4 mr-2" /> {hasPassword ? 'Chat Lock' : 'Add Lock'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDeleteAllDialog(true)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete All My Messages
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => onVideoCall?.(friend)}>
              <Video className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => setShowReactionPicker(null)}>
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
            <div className="space-y-3">
              {msgs.map((msg, i) => renderMessage(msg, i))}
            </div>
          </div>
        ))}

        <AnimatePresence>
          {isPartnerTyping && (
            <TypingIndicator 
              displayName={friend.display_name} 
              colorPrimary={friend.color_primary || undefined}
            />
          )}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/30 px-4 py-2 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Reply className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium truncate max-w-[200px]">{replyTo.content}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <div className="p-3 border-t border-border/30 safe-bottom" style={{ background: `linear-gradient(0deg, ${friend.color_primary || '#4ade80'}08, transparent)` }}>
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div key="recording" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 p-2 rounded-2xl bg-destructive/10">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="flex-1 font-mono">{formatDuration(duration)}</span>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={cancelRecording}><X className="w-5 h-5" /></Button>
              <Button variant="neon" size="icon" className="rounded-full" onClick={handleSendAudio}><Send className="w-5 h-5" /></Button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setShowARCamera(true)}>
                <Camera className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={startRecording}><Mic className="w-5 h-5" /></Button>
              <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-2xl p-1.5 border border-border/30">
                <input 
                  ref={inputRef} 
                  value={input} 
                  onChange={handleInputChange} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  onBlur={stopTyping}
                  placeholder={`message ${friend.display_name.split(' ')[0]}...`} 
                  className="flex-1 px-3 py-2 bg-transparent outline-none text-sm" 
                  maxLength={500} 
                />
                <Button variant="neon" size="sm" onClick={handleSend} disabled={!input.trim() || sending} className="rounded-xl px-4"><Send className="w-4 h-4" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lock Settings */}
      <AnimatePresence>
        {showLockSettings && (
          <ChatLockSettings chatId={friend.user_id} onClose={() => setShowLockSettings(false)} />
        )}
      </AnimatePresence>

      {/* Snap Editor */}
      <AnimatePresence>
        {snapImage && (
          <SnapEditor 
            imageUrl={snapImage} 
            onSend={handleSendSnap} 
            onClose={() => setSnapImage(null)} 
          />
        )}
      </AnimatePresence>

      {/* AR Camera */}
      <AnimatePresence>
        {showARCamera && (
          <ARFaceFilters 
            onCapture={handleARCapture}
            onClose={() => setShowARCamera(false)}
          />
        )}
      </AnimatePresence>

      {/* Delete All Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all your messages?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages you sent to {friend.display_name}. Messages they sent will remain. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ChatView;