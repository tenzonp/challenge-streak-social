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

interface ActivityItem {
  id: string;
  type: 'challenge' | 'message' | 'friend_request';
  title: string;
  description: string;
  created_at: string;
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
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchPreferences();
    fetchActivity();
  }, [user]);

  const fetchPreferences = async () => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user!.id)
      .single();

    if (data) {
      setPrefs(data as unknown as NotificationPrefs);
    } else if (error?.code === 'PGRST116') {
      // No preferences yet, create default
      await supabase.from('notification_preferences').insert({
        user_id: user!.id,
      });
    }
    setLoading(false);
  };

  const fetchActivity = async () => {
    if (!user) return;
    setActivityLoading(true);

    const [challengesRes, messagesRes, friendsRes] = await Promise.all([
      supabase
        .from('challenges')
        .select(`
          id,
          challenge_text,
          created_at,
          from_profile:profiles!challenges_from_user_id_fkey(display_name, username)
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          read,
          sender:profiles!messages_sender_id_fkey(display_name, username)
        `)
        .eq('receiver_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('friendships')
        .select(`
          id,
          created_at,
          status,
          user:profiles!friendships_user_id_fkey(display_name, username)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const items: ActivityItem[] = [];

    if (challengesRes.data) {
      challengesRes.data.forEach((c: any) => {
        items.push({
          id: `challenge-${c.id}`,
          type: 'challenge',
          title: 'New challenge',
          description: c.from_profile?.display_name
            ? `${c.from_profile.display_name} sent you: "${c.challenge_text}"`
            : c.challenge_text,
          created_at: c.created_at,
        });
      });
    }

    if (messagesRes.data) {
      messagesRes.data.forEach((m: any) => {
        items.push({
          id: `message-${m.id}`,
          type: 'message',
          title: m.sender?.display_name ? `New message from ${m.sender.display_name}` : 'New message',
          description: m.content,
          created_at: m.created_at,
        });
      });
    }

    if (friendsRes.data) {
      friendsRes.data.forEach((f: any) => {
        items.push({
          id: `friend-${f.id}`,
          type: 'friend_request',
          title: 'Friend request',
          description: f.user?.display_name
            ? `${f.user.display_name} wants to connect`
            : 'New friend request',
          created_at: f.created_at,
        });
      });
    }

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivity(items);
    setActivityLoading(false);
  };

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    setSaving(true);
    setPrefs(prev => ({ ...prev, [key]: value }));

    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user!.id,
        [key]: value,
      });

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
        const description =
          result.error === 'Permission denied'
            ? 'Notifications are blocked in your browser settings. Enable them to turn on push.'
            : result.error;
        toast({ title: 'Failed to enable push', description, variant: 'destructive' });
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
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-8 space-y-6">
        {/* Activity Feed */}
        <section className="glass rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Activity</h2>
              <p className="text-sm text-muted-foreground">
                New challenges, messages, and friend requests
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted/60">
              {activity.length} new
            </span>
          </div>

          {activityLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              You're all caught up. ✨
            </p>
          ) : (
            <div className="space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-muted">
                    {item.type === 'challenge' && <Flame className="w-4 h-4 text-primary" />}
                    {item.type === 'message' && <MessageCircle className="w-4 h-4 text-primary" />}
                    {item.type === 'friend_request' && <Users className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

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
                  {!isSupported
                    ? 'Not supported in this browser'
                    : permission === 'denied'
                      ? 'Blocked by browser'
                      : isSubscribed
                        ? 'Enabled'
                        : 'Disabled'}
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
