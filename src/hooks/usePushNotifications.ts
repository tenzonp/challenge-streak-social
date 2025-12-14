import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
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

  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  // Check if push notifications are supported
  useEffect(() => {
    if (isNative) {
      setIsSupported(true);
      console.log('[Push] Native platform detected:', platform);
    } else {
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
    }
  }, [isNative, platform]);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!user) return;

    try {
      if (isNative) {
        // Check FCM tokens table for native
        const { data } = await supabase
          .from('fcm_tokens')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const hasSubscription = !!data && data.length > 0;
        console.log('[Push] FCM token check:', hasSubscription ? 'exists' : 'none');
        setIsSubscribed(hasSubscription);

        const permResult = await PushNotifications.checkPermissions();
        setPermission(permResult.receive === 'granted' ? 'granted' : 
                     permResult.receive === 'denied' ? 'denied' : 'default');
      } else {
        // Check web push subscriptions
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const hasSubscription = !!data && data.length > 0;
        console.log('[Push] Web subscription check:', hasSubscription ? 'exists' : 'none');
        setIsSubscribed(hasSubscription);
      }
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
    }
  }, [user, isNative]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Setup native push notification listeners
  useEffect(() => {
    if (!isNative || !user) return;

    const setupListeners = async () => {
      // Handle successful registration - save FCM token
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[FCM] Registered with token:', token.value.substring(0, 20) + '...');
        
        try {
          // Store FCM token in fcm_tokens table
          const { error } = await supabase
            .from('fcm_tokens')
            .upsert({
              user_id: user.id,
              token: token.value,
              platform: platform as 'ios' | 'android',
            }, {
              onConflict: 'token'
            });

          if (error) {
            console.error('[FCM] Failed to save token:', error);
          } else {
            console.log('[FCM] Token saved to database');
            setIsSubscribed(true);
          }
        } catch (error) {
          console.error('[FCM] Error saving token:', error);
        }
      });

      // Handle registration errors
      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCM] Registration error:', error);
        setPermission('denied');
      });

      // Handle incoming notifications when app is in foreground
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[FCM] Notification received in foreground:', notification);
      });

      // Handle notification tap
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[FCM] Notification tapped:', action);
        const data = action.notification.data;
        if (data?.url) {
          window.location.href = data.url;
        }
      });
    };

    setupListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isNative, user, platform]);

  // Web push service worker helper
  const waitForServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');
    
    if (!registration) {
      console.log('[Push] No existing registration, registering new service worker...');
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    
    console.log('[Push] Service worker registration state:', registration.active?.state || 'no active worker');

    if (registration.waiting) {
      console.log('[Push] Skipping waiting service worker...');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

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

    await navigator.serviceWorker.ready;
    console.log('[Push] Service worker is ready');
    
    return registration;
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<SubscribeResult> => {
    if (!user) return { error: 'Not logged in' };
    if (!isSupported) return { error: 'Push notifications not supported' };
    
    setIsLoading(true);
    console.log('[Push] Starting subscription process...', isNative ? `Native (${platform})` : 'Web');

    try {
      if (isNative) {
        // Native push notifications via FCM
        const permResult = await PushNotifications.checkPermissions();
        console.log('[FCM] Current permission:', permResult.receive);
        
        if (permResult.receive === 'prompt' || permResult.receive === 'prompt-with-rationale') {
          const requestResult = await PushNotifications.requestPermissions();
          console.log('[FCM] Permission request result:', requestResult.receive);
          
          if (requestResult.receive !== 'granted') {
            setPermission('denied');
            setIsLoading(false);
            return { error: 'Permission denied' };
          }
        } else if (permResult.receive !== 'granted') {
          setPermission('denied');
          setIsLoading(false);
          return { error: 'Permission denied. Please enable notifications in device settings.' };
        }

        setPermission('granted');
        
        // Register for push notifications - this triggers the 'registration' listener
        await PushNotifications.register();
        console.log('[FCM] Registration triggered');
        
        setIsLoading(false);
        return { success: true };
      } else {
        // Web push notifications
        console.log('[Push] Requesting notification permission...');
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
        console.log('[Push] Permission result:', permissionResult);

        if (permissionResult !== 'granted') {
          setIsLoading(false);
          return { error: 'Permission denied' };
        }

        // Get or register service worker
        console.log('[Push] Getting service worker registration...');
        const registration = await waitForServiceWorker();

        // Get VAPID public key from edge function
        console.log('[Push] Fetching VAPID key...');
        const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-notifications', {
          body: { action: 'get-vapid-key' }
        });

        if (vapidError || !vapidData?.publicKey) {
          console.error('[Push] VAPID key error:', vapidError);
          setIsLoading(false);
          return { error: 'Could not get notification key from server' };
        }

        console.log('[Push] VAPID key received, length:', vapidData.publicKey.length);

        // Convert VAPID key and subscribe
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

        // Save subscription to database
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
          await subscription.unsubscribe();
          setIsLoading(false);
          return { error: 'Failed to save subscription' };
        }

        console.log('[Push] Subscription saved successfully!');
        setIsSubscribed(true);
        setIsLoading(false);
        return { success: true };
      }
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

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!user) return;
    
    setIsLoading(true);
    console.log('[Push] Unsubscribing...', isNative ? `Native (${platform})` : 'Web');

    try {
      if (isNative) {
        // Remove FCM tokens for native
        await supabase
          .from('fcm_tokens')
          .delete()
          .eq('user_id', user.id);
      } else {
        // Remove web push subscriptions
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);

        // Also unsubscribe from push manager
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      console.log('[Push] Unsubscribed successfully');
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
    isNative,
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
