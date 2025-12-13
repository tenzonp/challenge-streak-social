import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Send, Users, Flame, Trophy, Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationLog {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

interface UserWithSubscription {
  user_id: string;
  display_name: string;
  streak: number;
  has_subscription: boolean;
}

const NotificationAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [recentLogs, setRecentLogs] = useState<NotificationLog[]>([]);
  const [subscribedUsers, setSubscribedUsers] = useState<UserWithSubscription[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [stats, setStats] = useState({ totalUsers: 0, subscribedUsers: 0, sentToday: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    // Fetch subscribed users with profiles
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('user_id');

    const subscribedUserIds = [...new Set(subs?.map(s => s.user_id) || [])];

    if (subscribedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, streak')
        .in('user_id', subscribedUserIds);

      setSubscribedUsers(
        profiles?.map(p => ({ ...p, has_subscription: true })) || []
      );
    }

    // Fetch recent notification logs (user's own logs for now)
    const { data: logs } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    setRecentLogs(logs || []);

    // Calculate stats
    const { count: totalProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStats({
      totalUsers: totalProfiles || 0,
      subscribedUsers: subscribedUserIds.length,
      sentToday: logs?.filter(l => new Date(l.created_at) >= today).length || 0,
    });
  };

  const triggerStreakReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streak-reminders', {
        body: { action: 'streak_reminders' },
      });

      if (error) throw error;
      toast.success(`Sent ${data.sent} streak reminders!`);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send streak reminders');
    } finally {
      setLoading(false);
    }
  };

  const triggerBadgeReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streak-reminders', {
        body: { action: 'badge_reminders' },
      });

      if (error) throw error;
      toast.success(`Sent ${data.sent} badge reminders!`);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send badge reminders');
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Please enter title and body');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streak-reminders', {
        body: {
          action: 'broadcast',
          title: broadcastTitle,
          body: broadcastBody,
          notificationType,
        },
      });

      if (error) throw error;
      toast.success(`Broadcast sent to ${data.sent}/${data.total} users!`);
      setBroadcastTitle('');
      setBroadcastBody('');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  const sendToUser = async () => {
    if (!selectedUser || !broadcastTitle.trim() || !broadcastBody.trim()) {
      toast.error('Please select a user and enter title and body');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('streak-reminders', {
        body: {
          action: 'send_to_user',
          userId: selectedUser,
          title: broadcastTitle,
          body: broadcastBody,
          notificationType,
        },
      });

      if (error) throw error;
      toast.success(data.success ? 'Notification sent!' : 'Failed to send');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notification Manager</h1>
            <p className="text-muted-foreground">Send and manage push notifications</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Bell className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.subscribedUsers}</p>
                  <p className="text-sm text-muted-foreground">Subscribed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Send className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.sentToday}</p>
                  <p className="text-sm text-muted-foreground">Sent Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Retention Reminders
            </CardTitle>
            <CardDescription>
              Trigger automated reminders to boost engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={triggerStreakReminders} disabled={loading} className="flex-1">
              <Flame className="mr-2 h-4 w-4" />
              Send Streak Reminders
            </Button>
            <Button onClick={triggerBadgeReminders} disabled={loading} variant="outline" className="flex-1">
              <Trophy className="mr-2 h-4 w-4" />
              Send Badge Reminders
            </Button>
          </CardContent>
        </Card>

        {/* Custom Notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Send Custom Notification
            </CardTitle>
            <CardDescription>
              Broadcast to all users or send to a specific user
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Notification Type</Label>
                <Select value={notificationType} onValueChange={setNotificationType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="streak_reminder">Streak Reminder</SelectItem>
                    <SelectItem value="badge_reminder">Badge Reminder</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                    <SelectItem value="promo">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target User (optional)</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="All subscribed users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All subscribed users</SelectItem>
                    {subscribedUsers.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.display_name} (🔥 {u.streak})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="🔥 Don't miss out!"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Complete a challenge to keep your streak alive!"
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={selectedUser ? sendToUser : sendBroadcast} disabled={loading} className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                {selectedUser ? 'Send to User' : 'Broadcast to All'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No notifications sent yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {log.status === 'sent' ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{log.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{log.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {log.notification_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationAdmin;