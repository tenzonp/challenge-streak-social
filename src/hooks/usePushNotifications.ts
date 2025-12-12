import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, [user, isSupported]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    if (!user || !isSupported) return { error: 'Push not supported' };

    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        return { error: 'Permission denied' };
      }

      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      const { data: vapidData } = await supabase.functions.invoke('push-notifications', {
        body: { action: 'get-vapid-key' }
      });

      if (!vapidData?.publicKey) {
        return { error: 'Could not get VAPID key' };
      }

      const vapidKey = urlBase64ToUint8Array(vapidData.publicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey.buffer as ArrayBuffer
      });

      const subscriptionJson = subscription.toJSON();

      const { error } = await supabase
        .from('push_subscriptions' as any)
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh_key: subscriptionJson.keys!.p256dh,
          auth_key: subscriptionJson.keys!.auth
        } as any);

      if (error) {
        console.error('Error saving subscription:', error);
        return { error: 'Failed to save subscription' };
      }

      setIsSubscribed(true);
      return { success: true };
    } catch (error) {
      console.error('Error subscribing:', error);
      return { error: 'Failed to subscribe' };
    }
  };

  const unsubscribe = async () => {
    if (!user || !isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        await (supabase
          .from('push_subscriptions' as any) as any)
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe
  };
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
