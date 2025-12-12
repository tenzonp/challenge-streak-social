import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageCircle, Flame, Users, Trophy, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPrefs {
  challenges_enabled: boolean;
  messages_enabled: boolean;
  streak_reminders_enabled: boolean;
  friend_requests_enabled: boolean;
  competition_updates_enabled: boolean;
  achievement_unlocks_enabled: boolean;
}

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    challenges_enabled: true,
    messages_enabled: true,
    streak_reminders_enabled: true,
    friend_requests_enabled: true,
    competition_updates_enabled: true,
    achievement_unlocks_enabled: true,
  });

  useEffect(() => {
    if (!user) return;
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    const { data, error } = await supabase
      .from('notification_preferences' as any)
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setPrefs(data as unknown as NotificationPrefs);
    } else if (error?.code === 'PGRST116') {
      // No preferences yet, create default
      await supabase.from('notification_preferences' as any).insert({
        user_id: user!.id,
      } as any);
    }
    setLoading(false);
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    setSaving(true);
    setPrefs(prev => ({ ...prev, [key]: value }));

    const { error } = await supabase
      .from('notification_preferences' as any)
      .upsert({
        user_id: user!.id,
        [key]: value,
      } as any);

    if (error) {
      toast({ title: 'Failed to save', variant: 'destructive' });
      setPrefs(prev => ({ ...prev, [key]: !value }));
    }
    setSaving(false);
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast({ title: 'Push notifications disabled' });
    } else {
      const result = await subscribe();
      if (result?.error) {
        toast({ title: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Push notifications enabled! 🔔' });
      }
    }
  };

  const notificationTypes = [
    { key: 'challenges_enabled' as const, icon: Flame, label: 'New Challenges', desc: 'When someone sends you a challenge' },
    { key: 'messages_enabled' as const, icon: MessageCircle, label: 'Messages', desc: 'When you receive a new message' },
    { key: 'streak_reminders_enabled' as const, icon: Bell, label: 'Streak Reminders', desc: 'Reminders to keep your streak alive' },
    { key: 'friend_requests_enabled' as const, icon: Users, label: 'Friend Requests', desc: 'When someone wants to connect' },
    { key: 'competition_updates_enabled' as const, icon: Trophy, label: 'Competition Updates', desc: 'Leaderboard changes and results' },
    { key: 'achievement_unlocks_enabled' as const, icon: Award, label: 'Achievements', desc: 'When you unlock new badges' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Notification Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-8 space-y-6">
        {/* Push Notifications Master Toggle */}
        <section className="glass rounded-3xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
                <Bell className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Push Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  {!isSupported ? 'Not supported in this browser' : 
                   permission === 'denied' ? 'Blocked by browser' :
                   isSubscribed ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
            <Switch 
              checked={isSubscribed} 
              onCheckedChange={handlePushToggle}
              disabled={!isSupported || permission === 'denied'}
            />
          </div>
          
          {permission === 'denied' && (
            <p className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
              Push notifications are blocked. Enable them in your browser settings.
            </p>
          )}
        </section>

        {/* Individual Notification Types */}
        <section className="glass rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-semibold">Notification Types</h2>
            <p className="text-sm text-muted-foreground">Choose what you want to be notified about</p>
          </div>
          
          <div className="divide-y divide-border/30">
            {notificationTypes.map(({ key, icon: Icon, label, desc }) => (
              <div key={key} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch 
                  checked={prefs[key]} 
                  onCheckedChange={(v) => updatePref(key, v)}
                  disabled={saving || !isSubscribed}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">
          You can change these settings anytime. We respect your peace! 🧘
        </p>
      </main>
    </div>
  );
};

export default NotificationSettings;
