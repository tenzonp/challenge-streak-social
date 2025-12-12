import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useTypingIndicator = (chatPartnerId: string) => {
  const { user } = useAuth();
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Set typing status (debounced)
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!user) return;

    const now = Date.now();
    // Debounce: only update if 500ms has passed since last update
    if (isTyping && now - lastTypingRef.current < 500) return;
    lastTypingRef.current = now;

    try {
      await supabase
        .from('typing_status')
        .upsert({
          user_id: user.id,
          chat_partner_id: chatPartnerId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,chat_partner_id'
        });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user, chatPartnerId]);

  // Handle typing with auto-clear
  const handleTyping = useCallback(() => {
    setTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-clear after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Subscribe to partner's typing status
  useEffect(() => {
    if (!user || !chatPartnerId) return;

    // Fetch initial status
    const fetchStatus = async () => {
      const { data } = await supabase
        .from('typing_status')
        .select('is_typing, updated_at')
        .eq('user_id', chatPartnerId)
        .eq('chat_partner_id', user.id)
        .single();

      if (data) {
        // Check if typing status is recent (within 5 seconds)
        const updatedAt = new Date(data.updated_at).getTime();
        const isRecent = Date.now() - updatedAt < 5000;
        setIsPartnerTyping(data.is_typing && isRecent);
      }
    };

    fetchStatus();

    // Real-time subscription
    const channel = supabase
      .channel(`typing-${chatPartnerId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `user_id=eq.${chatPartnerId}`,
        },
        (payload) => {
          const data = payload.new as any;
          if (data?.chat_partner_id === user.id) {
            setIsPartnerTyping(data.is_typing);

            // Auto-clear after 5 seconds if still showing
            if (data.is_typing) {
              setTimeout(() => {
                setIsPartnerTyping(false);
              }, 5000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopTyping();
    };
  }, [user, chatPartnerId, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    isPartnerTyping,
    handleTyping,
    stopTyping,
  };
};