import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { hapticFeedback } from '@/utils/nativeApp';

const NotificationPrompt = () => {
  const { isSupported, isSubscribed, permission, subscribe, isLoading } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('notification-prompt-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show after a delay if not subscribed
    if (isSupported && !isSubscribed && permission !== 'denied') {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    hapticFeedback('medium');
    const result = await subscribe();
    if (result.success) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    hapticFeedback('light');
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem('notification-prompt-dismissed', 'true');
  };

  if (!show || dismissed || isSubscribed || permission === 'denied') {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in">
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Enable notifications</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Get notified about new challenges, messages & more
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isLoading}
                className="text-xs h-8"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8 text-muted-foreground"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 -mr-1 -mt-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPrompt;