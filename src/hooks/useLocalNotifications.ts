import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface ScheduleOptions {
  id: number;
  title: string;
  body: string;
  scheduleAt?: Date;
  repeatEvery?: 'day' | 'hour' | 'minute';
  smallIcon?: string;
  largeIcon?: string;
  actionTypeId?: string;
  extra?: Record<string, string>;
}

export const useLocalNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    if (!isNative) {
      setIsSupported(false);
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      setIsSupported(true);
      
      const { display } = await LocalNotifications.checkPermissions();
      setHasPermission(display === 'granted');
    } catch (e) {
      console.log('Local notifications not available:', e);
      setIsSupported(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { display } = await LocalNotifications.requestPermissions();
      const granted = display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return false;
    }
  }, [isNative]);

  const scheduleNotification = useCallback(async (options: ScheduleOptions): Promise<boolean> => {
    if (!isNative) {
      // Web fallback - show toast immediately if no schedule
      if (!options.scheduleAt) {
        toast(options.title, { description: options.body });
      }
      return true;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Request permission if needed
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== 'granted') {
        const { display: newDisplay } = await LocalNotifications.requestPermissions();
        if (newDisplay !== 'granted') {
          console.log('Notification permission denied');
          return false;
        }
      }

      const notification: any = {
        id: options.id,
        title: options.title,
        body: options.body,
        sound: 'default',
        smallIcon: options.smallIcon || 'ic_stat_icon_config_sample',
        largeIcon: options.largeIcon,
        actionTypeId: options.actionTypeId,
        extra: options.extra,
      };

      if (options.scheduleAt) {
        notification.schedule = {
          at: options.scheduleAt,
          allowWhileIdle: true,
        };

        if (options.repeatEvery) {
          notification.schedule.every = options.repeatEvery;
        }
      }

      await LocalNotifications.schedule({
        notifications: [notification],
      });

      return true;
    } catch (e) {
      console.error('Error scheduling notification:', e);
      return false;
    }
  }, [isNative]);

  const cancelNotification = useCallback(async (id: number): Promise<void> => {
    if (!isNative) return;

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (e) {
      console.error('Error canceling notification:', e);
    }
  }, [isNative]);

  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    if (!isNative) return;

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (e) {
      console.error('Error canceling all notifications:', e);
    }
  }, [isNative]);

  const getPendingNotifications = useCallback(async () => {
    if (!isNative) return [];

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const pending = await LocalNotifications.getPending();
      return pending.notifications;
    } catch (e) {
      console.error('Error getting pending notifications:', e);
      return [];
    }
  }, [isNative]);

  // Pre-defined notification schedulers for common use cases
  const scheduleStreakReminder = useCallback(async (hour: number = 20, minute: number = 0): Promise<boolean> => {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    return scheduleNotification({
      id: 1001, // Reserved ID for streak reminder
      title: "Don't break your streak! 🔥",
      body: "Complete a challenge today to keep your streak going!",
      scheduleAt: scheduledTime,
      repeatEvery: 'day',
      extra: { type: 'streak_reminder' },
    });
  }, [scheduleNotification]);

  const scheduleChallengeReminder = useCallback(async (
    challengeId: string, 
    challengeText: string, 
    expiresAt: Date
  ): Promise<boolean> => {
    // Schedule reminder 1 hour before expiry
    const reminderTime = new Date(expiresAt.getTime() - 60 * 60 * 1000);
    
    if (reminderTime <= new Date()) {
      // Too late to schedule
      return false;
    }

    // Create unique ID from challenge ID
    const id = parseInt(challengeId.replace(/\D/g, '').slice(0, 8)) || Date.now();

    return scheduleNotification({
      id,
      title: "Challenge expiring soon! ⚡",
      body: `"${challengeText}" - Complete it before it expires!`,
      scheduleAt: reminderTime,
      extra: { type: 'challenge_reminder', challengeId },
    });
  }, [scheduleNotification]);

  const showInstantNotification = useCallback(async (
    title: string, 
    body: string,
    extra?: Record<string, string>
  ): Promise<boolean> => {
    if (!isNative) {
      toast(title, { description: body });
      return true;
    }

    return scheduleNotification({
      id: Date.now(),
      title,
      body,
      extra,
    });
  }, [isNative, scheduleNotification]);

  // Setup notification action listeners
  useEffect(() => {
    if (!isNative) return;

    let cleanup: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        // Handle notification received while app is open
        const receivedListener = await LocalNotifications.addListener(
          'localNotificationReceived',
          (notification) => {
            console.log('Notification received:', notification);
            // Show in-app toast for received notifications
            toast(notification.title || 'Notification', {
              description: notification.body,
            });
          }
        );

        // Handle notification action (user tapped notification)
        const actionListener = await LocalNotifications.addListener(
          'localNotificationActionPerformed',
          (action) => {
            console.log('Notification action:', action);
            const extra = action.notification.extra;
            
            if (extra?.type === 'streak_reminder') {
              // Could navigate to challenges or home
              document.dispatchEvent(new CustomEvent('notification-action', {
                detail: { type: 'streak_reminder' }
              }));
            } else if (extra?.type === 'challenge_reminder') {
              document.dispatchEvent(new CustomEvent('notification-action', {
                detail: { type: 'challenge_reminder', challengeId: extra.challengeId }
              }));
            }
          }
        );

        cleanup = () => {
          receivedListener.remove();
          actionListener.remove();
        };
      } catch (e) {
        console.log('Error setting up notification listeners:', e);
      }
    };

    setupListeners();

    return () => {
      cleanup?.();
    };
  }, [isNative]);

  return {
    isSupported,
    hasPermission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    getPendingNotifications,
    // Convenience methods
    scheduleStreakReminder,
    scheduleChallengeReminder,
    showInstantNotification,
  };
};
