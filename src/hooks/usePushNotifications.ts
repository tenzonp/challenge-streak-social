import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SubscribeResult {
  success?: boolean;
  error?: string;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    console.log('[Push] Browser support check:', { 
      Notification: 'Notification' in window,
      serviceWorker: 'serviceWorker' in navigator,
      PushManager: 'PushManager' in window,
      supported 
    });
    setIsSupported(supported);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!user || !isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      console.log('[Push] Current subscription:', subscription?.endpoint ? 'exists' : 'none');
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
    }
  }, [user, isSupported]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const waitForServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    // First check if there's an existing registration
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');
    
    if (!registration) {
      console.log('[Push] No existing registration, registering new service worker...');
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    
    console.log('[Push] Service worker registration state:', registration.active?.state || 'no active worker');

    // If there's a waiting worker, skip it to activate
    if (registration.waiting) {
      console.log('[Push] Skipping waiting service worker...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Wait for the service worker to be ready
    if (registration.installing) {
      console.log('[Push] Waiting for service worker to install...');
      await new Promise<void>((resolve) => {
        registration!.installing!.addEventListener('statechange', function handler(e) {
          if ((e.target as ServiceWorker).state === 'activated') {
            resolve();
          }
        });
      });
    }

    // Ensure we have an active service worker
    await navigator.serviceWorker.ready;
    console.log('[Push] Service worker is ready');
    
    return registration;
  };

  const subscribe = async (): Promise<SubscribeResult> => {
    if (!user) return { error: 'Not logged in' };
    if (!isSupported) return { error: 'Push notifications not supported in this browser' };
    
    setIsLoading(true);
    console.log('[Push] Starting subscription process...');

    try {
      // Step 1: Request notification permission
      console.log('[Push] Requesting notification permission...');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      console.log('[Push] Permission result:', permissionResult);

      if (permissionResult !== 'granted') {
        setIsLoading(false);
        return { error: 'Permission denied' };
      }

      // Step 2: Get or register service worker
      console.log('[Push] Getting service worker registration...');
      const registration = await waitForServiceWorker();

      // Step 3: Get VAPID public key from edge function
      console.log('[Push] Fetching VAPID key...');
      const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-notifications', {
        body: { action: 'get-vapid-key' }
      });

      if (vapidError) {
        console.error('[Push] VAPID key error:', vapidError);
        setIsLoading(false);
        return { error: 'Could not get notification key from server' };
      }

      if (!vapidData?.publicKey) {
        console.error('[Push] No VAPID public key returned');
        setIsLoading(false);
        return { error: 'VAPID key not configured on server' };
      }

      console.log('[Push] VAPID key received, length:', vapidData.publicKey.length);

      // Step 4: Convert VAPID key and subscribe
      const vapidKey = urlBase64ToUint8Array(vapidData.publicKey);
      console.log('[Push] Subscribing to push manager...');
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[Push] Already subscribed, unsubscribing first...');
        await subscription.unsubscribe();
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(vapidKey)
      });

      console.log('[Push] Subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Step 5: Save subscription to database
      const subscriptionJson = subscription.toJSON();
      console.log('[Push] Saving subscription to database...');

      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJson.endpoint!,
          p256dh_key: subscriptionJson.keys!.p256dh,
          auth_key: subscriptionJson.keys!.auth
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (dbError) {
        console.error('[Push] Database error:', dbError);
        // Try to clean up the subscription
        await subscription.unsubscribe();
        setIsLoading(false);
        return { error: 'Failed to save subscription' };
      }

      console.log('[Push] Subscription saved successfully!');
      setIsSubscribed(true);
      setIsLoading(false);
      return { success: true };
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      setIsLoading(false);
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          return { error: 'Permission denied' };
        }
        if (error.message.includes('network')) {
          return { error: 'Network error, please try again' };
        }
        return { error: error.message };
      }
      
      return { error: 'Failed to subscribe to notifications' };
    }
  };

  const unsubscribe = async () => {
    if (!user || !isSupported) return;
    
    setIsLoading(true);
    console.log('[Push] Unsubscribing...');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Remove from database first
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
        
        // Then unsubscribe from push manager
        await subscription.unsubscribe();
        console.log('[Push] Unsubscribed successfully');
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  // Pad the base64 string if needed
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
