import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
      await PushNotifications.addListener('registration', async (token: Token) => {
        console.log('[FCM] Registered with token:', token.value.substring(0, 20) + '...');
        
        try {
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

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCM] Registration error:', error);
        setPermission('denied');
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[FCM] Notification received in foreground:', notification);
      });

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

  // Register service worker for web push
  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    console.log('[Push] Registering service worker...');
    
    // Unregister existing service workers first
    const existingRegs = await navigator.serviceWorker.getRegistrations();
    for (const reg of existingRegs) {
      if (reg.scope.includes('/')) {
        console.log('[Push] Unregistering existing SW:', reg.scope);
        await reg.unregister();
      }
    }
    
    // Register fresh service worker
    const registration = await navigator.serviceWorker.register('/sw.js', { 
      scope: '/',
      updateViaCache: 'none'
    });
    
    console.log('[Push] SW registered, state:', registration.active?.state);
    
    // Wait for it to be ready
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker).state === 'activated') {
            resolve();
          }
        });
      });
    }
    
    await navigator.serviceWorker.ready;
    console.log('[Push] Service worker ready');
    
    return registration;
  };

  // Subscribe to push notifications
  const subscribe = async (): Promise<SubscribeResult> => {
    if (!user) return { error: 'Not logged in' };
    if (!isSupported) return { error: 'Push notifications not supported' };
    
    setIsLoading(true);
    console.log('[Push] Starting subscription...', isNative ? `Native (${platform})` : 'Web');

    try {
      if (isNative) {
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
          toast.error('Notification permission denied');
          return { error: 'Permission denied' };
        }

        // Register service worker
        const registration = await registerServiceWorker();

        // Get VAPID public key
        console.log('[Push] Fetching VAPID key...');
        const { data: vapidData, error: vapidError } = await supabase.functions.invoke('push-notifications', {
          body: { action: 'get-vapid-key' }
        });

        if (vapidError || !vapidData?.publicKey) {
          console.error('[Push] VAPID key error:', vapidError, vapidData);
          setIsLoading(false);
          toast.error('Could not get notification key from server');
          return { error: 'Could not get notification key from server' };
        }

        console.log('[Push] VAPID key received');

        // Convert VAPID key
        const vapidKey = urlBase64ToUint8Array(vapidData.publicKey);
        
        // Unsubscribe from existing if any
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          console.log('[Push] Unsubscribing from existing subscription');
          await existingSub.unsubscribe();
        }

        // Subscribe to push manager
        console.log('[Push] Subscribing to push manager...');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey.buffer as ArrayBuffer
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
          toast.error('Failed to save subscription');
          return { error: 'Failed to save subscription' };
        }

        console.log('[Push] Subscription saved successfully!');
        setIsSubscribed(true);
        setIsLoading(false);
        toast.success('Notifications enabled!');
        return { success: true };
      }
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      setIsLoading(false);
      
      const message = error instanceof Error ? error.message : 'Failed to subscribe';
      toast.error(message);
      return { error: message };
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    if (!user) return;
    
    console.log('[Push] Sending test notification...');
    
    const { data, error } = await supabase.functions.invoke('push-notifications', {
      body: { action: 'send-test', userId: user.id }
    });

    console.log('[Push] Test result:', data, error);
    
    if (error) {
      toast.error('Failed to send test notification');
    } else if (data?.success) {
      toast.success('Test notification sent!');
    } else {
      toast.error(data?.reason || 'No subscriptions found');
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    if (!user) return;
    
    setIsLoading(true);
    console.log('[Push] Unsubscribing...', isNative ? `Native (${platform})` : 'Web');

    try {
      if (isNative) {
        await supabase
          .from('fcm_tokens')
          .delete()
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      console.log('[Push] Unsubscribed successfully');
      setIsSubscribed(false);
      toast.success('Notifications disabled');
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      toast.error('Failed to unsubscribe');
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
    unsubscribe,
    sendTestNotification
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
