import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/hooks/useProfile';

export type MessageType = 'text' | 'snap' | 'voice';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  message_type: MessageType;
  status: MessageStatus;
  media_url?: string | null;
  snap_views_remaining?: number | null;
  audio_duration?: number | null;
  reply_to_id?: string | null;
  reply_to?: Message | null;
  is_reported?: boolean;
  reactions?: MessageReaction[];
}

export interface Conversation {
  friend: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: messages } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*),
        receiver:profiles!messages_receiver_id_fkey(*)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!messages) {
      setLoading(false);
      return;
    }

    const convMap = new Map<string, Conversation>();
    
    messages.forEach((msg: any) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const partner = msg.sender_id === user.id ? msg.receiver : msg.sender;
      
      if (!convMap.has(partnerId) && partner) {
        convMap.set(partnerId, {
          friend: partner as Profile,
          lastMessage: msg,
          unreadCount: msg.receiver_id === user.id && !msg.read ? 1 : 0,
        });
      } else if (convMap.has(partnerId) && msg.receiver_id === user.id && !msg.read) {
        const conv = convMap.get(partnerId)!;
        conv.unreadCount++;
      }
    });

    setConversations(Array.from(convMap.values()));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { fetchConversations(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchConversations]);

  const sendMessage = async (
    receiverId: string, 
    content: string, 
    messageType: MessageType = 'text',
    mediaUrl?: string,
    audioDuration?: number,
    replyToId?: string
  ) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        content,
        message_type: messageType,
        status: 'sent',
        media_url: mediaUrl,
        snap_views_remaining: messageType === 'snap' ? 3 : null,
        audio_duration: audioDuration,
        reply_to_id: replyToId,
      });

    if (!error) { fetchConversations(); }
    return { error };
  };

  const getMessages = async (partnerId: string, searchQuery?: string) => {
    if (!user) return [];

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim()) {
      query = query.ilike('content', `%${searchQuery.trim()}%`);
    }

    const { data } = await query;

    // Mark as read and update status
    await supabase
      .from('messages')
      .update({ read: true, status: 'read' })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id);

    // Fetch reactions for messages
    if (data && data.length > 0) {
      const messageIds = data.map(m => m.id);
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', messageIds);

      const messagesWithReactions = data.map(msg => ({
        ...msg,
        reactions: reactions?.filter(r => r.message_id === msg.id) || []
      }));

      return messagesWithReactions as Message[];
    }

    return (data || []) as Message[];
  };

  const searchMessages = async (partnerId: string, searchQuery: string) => {
    if (!user || !searchQuery.trim()) return [];

    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(*)
      `)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .ilike('content', `%${searchQuery.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    return (data || []) as Message[];
  };

  const markSnapAsViewed = async (messageId: string) => {
    // This updates the status to 'read' when a snap is viewed
    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('id', messageId);
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', user.id);

    return { error };
  };

  const deleteAllChat = async (partnerId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Delete messages sent by user to partner
    await supabase
      .from('messages')
      .delete()
      .eq('sender_id', user.id)
      .eq('receiver_id', partnerId);

    return { success: true };
  };

  const reportMessage = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_reported: true })
      .eq('id', messageId);

    return { error };
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      });

    return { error };
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    return { error };
  };

  const decrementSnapViews = async (messageId: string): Promise<number | null> => {
    const { data } = await supabase
      .from('messages')
      .select('snap_views_remaining')
      .eq('id', messageId)
      .single();

    if (data && data.snap_views_remaining && data.snap_views_remaining > 0) {
      const newCount = data.snap_views_remaining - 1;
      await supabase
        .from('messages')
        .update({ snap_views_remaining: newCount })
        .eq('id', messageId);
      return newCount;
    }
    return data?.snap_views_remaining ?? null;
  };

  return { 
    conversations, 
    loading, 
    sendMessage, 
    getMessages, 
    searchMessages,
    markSnapAsViewed,
    refetch: fetchConversations,
    deleteMessage,
    deleteAllChat,
    reportMessage,
    addReaction,
    removeReaction,
    decrementSnapViews,
  };
};
