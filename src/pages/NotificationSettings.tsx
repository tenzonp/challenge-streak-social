import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, MessageCircle, Flame, Users, Trophy, Award, Loader2, ChevronRight, Send } from 'lucide-react';
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
  isRead: boolean;
  // Navigation data
  senderId?: string;
  challengeId?: string;
  friendshipId?: string;
}

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSupported, isSubscribed, isLoading: pushLoading, permission, subscribe, unsubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
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
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    fetchPreferences();
    fetchActivity();
    fetchReadNotifications();
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
      await supabase.from('notification_preferences').insert({
        user_id: user!.id,
      });
    }
    setLoading(false);
  };

  const fetchReadNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notification_reads')
      .select('notification_type, notification_id')
      .eq('user_id', user.id);

    if (data) {
      const readSet = new Set(data.map(r => `${r.notification_type}-${r.notification_id}`));
      setReadNotifications(readSet);
    }
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
          from_user_id,
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
          sender_id,
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
          user_id,
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
          isRead: readNotifications.has(`challenge-${c.id}`),
          challengeId: c.id,
          senderId: c.from_user_id,
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
          isRead: readNotifications.has(`message-${m.id}`),
          senderId: m.sender_id,
        });
      });
    }

    if (friendsRes.data) {
      friendsRes.data.forEach((f: any) => {
        items.push({
          id: `friend_request-${f.id}`,
          type: 'friend_request',
          title: 'Friend request',
          description: f.user?.display_name
            ? `${f.user.display_name} wants to connect`
            : 'New friend request',
          created_at: f.created_at,
          isRead: readNotifications.has(`friend_request-${f.id}`),
          friendshipId: f.id,
          senderId: f.user_id,
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
        let description = result.error;
        if (result.error === 'Permission denied') {
          description = 'Notifications are blocked. Please enable them in your browser settings (click the lock icon in the address bar).';
        } else if (result.error.includes('VAPID')) {
          description = 'Server configuration issue. Please try again later.';
        }
        toast({ title: 'Failed to enable push', description, variant: 'destructive' });
      } else {
        toast({ title: 'Push notifications enabled! 🔔' });
      }
    }
  };

  const handleTestPush = async () => {
    if (!isSubscribed || !user) {
      toast({ title: 'Enable push notifications first', variant: 'destructive' });
      return;
    }

    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send',
          userId: user.id,
          payload: {
            title: 'Test Notification 🎉',
            body: 'Push notifications are working! You\'ll receive alerts for challenges, messages, and more.',
            tag: 'test-notification',
            data: { url: '/notifications' }
          }
        }
      });

      if (error) {
        console.error('Test push error:', error);
        toast({ title: 'Failed to send test', description: error.message, variant: 'destructive' });
      } else if (data?.sent > 0) {
        toast({ title: 'Test notification sent! Check your device.' });
      } else {
        toast({ title: 'No active subscriptions found', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Test push error:', err);
      toast({ title: 'Failed to send test notification', variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleActivityTap = async (item: ActivityItem) => {
    // Mark as read
    if (!item.isRead && user) {
      const [type, id] = item.id.split('-');
      const notificationId = item.id.replace(`${type}-`, '');
      
      await supabase.from('notification_reads').upsert({
        user_id: user.id,
        notification_type: type,
        notification_id: notificationId,
      }, { onConflict: 'user_id,notification_type,notification_id' });

      setReadNotifications(prev => new Set([...prev, item.id]));
      setActivity(prev => prev.map(a => 
        a.id === item.id ? { ...a, isRead: true } : a
      ));
    }

    // Navigate based on item type
    if (item.type === 'message' && item.senderId) {
      navigate('/', { state: { openChatWith: item.senderId } });
    } else if (item.type === 'challenge') {
      navigate('/', { state: { activeTab: 'challenges', highlightChallenge: item.challengeId } });
    } else if (item.type === 'friend_request' && item.senderId) {
      navigate('/', { state: { viewProfile: item.senderId } });
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const unreadCount = activity.filter(a => !a.isRead).length;

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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/settings')}
            className="rounded-full"
            type="button"
          >
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
                Tap to view details
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">
                {unreadCount} unread
              </span>
            )}
          </div>

          {activityLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleActivityTap(item)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-left active:scale-[0.98] ${
                    item.isRead 
                      ? 'bg-muted/20 opacity-60' 
                      : 'bg-muted/40 hover:bg-muted/60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative ${
                    item.type === 'challenge' ? 'bg-orange-500/20' :
                    item.type === 'message' ? 'bg-blue-500/20' :
                    'bg-green-500/20'
                  }`}>
                    {item.type === 'challenge' && <Flame className="w-5 h-5 text-orange-500" />}
                    {item.type === 'message' && <MessageCircle className="w-5 h-5 text-blue-500" />}
                    {item.type === 'friend_request' && <Users className="w-5 h-5 text-green-500" />}
                    {!item.isRead && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${item.isRead ? 'font-normal' : 'font-medium'}`}>
                        {item.title}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {getTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Push Notifications Master Toggle */}
        <section className="glass rounded-3xl p-6 space-y-4">
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
              disabled={!isSupported || permission === 'denied' || pushLoading}
            />
          </div>

          {permission === 'denied' && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
              Push notifications are blocked. Click the lock icon in your browser's address bar → Site Settings → Notifications → Allow.
            </p>
          )}

          {pushLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Setting up notifications...</span>
            </div>
          )}

          {/* Test Push Button */}
          {isSubscribed && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleTestPush}
              disabled={sendingTest}
              className="w-full gap-2"
            >
              {sendingTest ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Test Notification
            </Button>
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
                  disabled={saving}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Info */}
        <p className="text-center text-sm text-muted-foreground">
          You can change these settings anytime. We respect your peace!
        </p>
      </main>
    </div>
  );
};

export default NotificationSettings;
