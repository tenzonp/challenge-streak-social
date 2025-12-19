import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Zap, UserPlus, Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChallenges } from '@/hooks/useChallenges';
import { useFriends } from '@/hooks/useFriends';
import { formatDistanceToNow } from 'date-fns';
import { hapticFeedback } from '@/utils/nativeApp';

interface Notification {
  id: string;
  type: 'challenge' | 'friend_request' | 'reaction' | 'message';
  title: string;
  body: string;
  created_at: string;
  read: boolean;
  data?: Record<string, string>;
}

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pendingChallenges } = useChallenges();
  const { pendingRequests } = useFriends();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      // Fetch notification logs
      const { data } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data.map(n => ({
          id: n.id,
          type: n.notification_type as Notification['type'],
          title: n.title,
          body: n.body,
          created_at: n.created_at,
          read: n.status === 'read',
        })));
      }
    };

    loadNotifications();
  }, [user]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'challenge': return <Zap className="w-5 h-5" />;
      case 'friend_request': return <UserPlus className="w-5 h-5" />;
      case 'reaction': return <Heart className="w-5 h-5" />;
      case 'message': return <MessageCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const handleBack = () => {
    hapticFeedback('light');
    navigate('/');
  };

  const allItems = [
    ...pendingChallenges.map(c => ({
      id: c.id,
      type: 'challenge' as const,
      title: 'New Challenge',
      body: `${c.from_user?.display_name || 'Someone'} challenged you: ${c.challenge_text}`,
      created_at: c.created_at,
      read: false,
    })),
    ...pendingRequests.map(r => ({
      id: r.id,
      type: 'friend_request' as const,
      title: 'Friend Request',
      body: `${r.requester?.display_name || 'Someone'} wants to be friends`,
      created_at: r.created_at,
      read: false,
    })),
    ...notifications,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-lg">Notifications</h1>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16 pb-8 px-4">
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {allItems.map(item => (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${
                  !item.read ? 'bg-muted/50' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  item.type === 'challenge' ? 'bg-primary/10 text-primary' :
                  item.type === 'friend_request' ? 'bg-blue-500/10 text-blue-500' :
                  item.type === 'reaction' ? 'bg-red-500/10 text-red-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-muted-foreground text-sm line-clamp-2">{item.body}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!item.read && (
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
