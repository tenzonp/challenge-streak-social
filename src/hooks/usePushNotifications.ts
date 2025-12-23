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
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      console.log('[Push] Browser support check:', { 
        Notification: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
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
        // Check for web FCM tokens
        const { data } = await supabase
          .from('fcm_tokens')
          .select('id')
          .eq('user_id', user.id)
          .eq('platform', 'web')
          .limit(1);

        const hasSubscription = !!data && data.length > 0;
        console.log('[Push] Web FCM token check:', hasSubscription ? 'exists' : 'none');
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

  // Initialize Firebase for web push
  const initFirebaseMessaging = async () => {
    const { initializeApp } = await import('firebase/app');
    const { getMessaging, getToken: getFcmToken } = await import('firebase/messaging');
    
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    console.log('[Firebase] Config:', { 
      hasApiKey: !!config.apiKey,
      projectId: config.projectId,
      senderId: config.messagingSenderId 
    });

    if (!config.apiKey || !config.projectId || !config.messagingSenderId) {
      throw new Error('Firebase configuration missing');
    }

    const app = initializeApp(config);
    const messaging = getMessaging(app);

    // Register service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('[Firebase] Service worker registered');

    // Send config to service worker
    if (registration.active) {
      registration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config
      });
    }

    // Get FCM token with VAPID key
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    console.log('[Firebase] Getting token with VAPID key:', vapidKey?.substring(0, 20) + '...');

    const token = await getFcmToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    console.log('[Firebase] FCM token received:', token?.substring(0, 30) + '...');
    return token;
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
        // Web push with Firebase
        console.log('[Push] Requesting notification permission...');
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
        console.log('[Push] Permission result:', permissionResult);

        if (permissionResult !== 'granted') {
          setIsLoading(false);
          toast.error('Notification permission denied');
          return { error: 'Permission denied' };
        }

        // Get Firebase FCM token
        const token = await initFirebaseMessaging();

        if (!token) {
          setIsLoading(false);
          toast.error('Failed to get notification token');
          return { error: 'Failed to get notification token' };
        }

        // Save FCM token to database
        const { error: dbError } = await supabase
          .from('fcm_tokens')
          .upsert({
            user_id: user.id,
            token: token,
            platform: 'web'
          }, {
            onConflict: 'token'
          });

        if (dbError) {
          console.error('[Push] Database error:', dbError);
          setIsLoading(false);
          toast.error('Failed to save subscription');
          return { error: 'Failed to save subscription' };
        }

        console.log('[Push] FCM token saved successfully!');
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
      // Delete FCM tokens
      await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', user.id);

      // Also delete old web push subscriptions
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

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
