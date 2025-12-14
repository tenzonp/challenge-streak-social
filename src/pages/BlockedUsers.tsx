import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/hooks/useProfile';

interface BlockedUser {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  blocked_profile: Profile;
}

const BlockedUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchBlockedUsers();
  }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        created_at,
        blocked_profile:profiles!friendships_friend_id_fkey(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'blocked');

    if (error) {
      console.error('Error fetching blocked users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blocked users',
        variant: 'destructive',
      });
    } else {
      setBlockedUsers((data || []) as unknown as BlockedUser[]);
    }
    setLoading(false);
  };

  const handleUnblock = async (friendshipId: string, username: string) => {
    const confirmUnblock = window.confirm(`Unblock @${username}? You'll see their posts again.`);
    if (!confirmUnblock) return;

    setUnblocking(friendshipId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) {
        throw error;
      }

      setBlockedUsers(prev => prev.filter(b => b.id !== friendshipId));
      toast({
        title: 'User unblocked',
        description: `@${username} has been unblocked`,
      });
    } catch (e) {
      console.error('Error unblocking user:', e);
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive',
      });
    } finally {
      setUnblocking(null);
    }
  };

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
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Blocked Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage accounts you've blocked
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {blockedUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserX className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No blocked users</h2>
            <p className="text-muted-foreground">
              You haven't blocked anyone yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((blocked) => (
              <div
                key={blocked.id}
                className="glass rounded-2xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={
                      blocked.blocked_profile?.avatar_url ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${blocked.friend_id}`
                    }
                    alt={blocked.blocked_profile?.display_name || 'User'}
                    className="w-12 h-12 rounded-xl"
                  />
                  <div>
                    <p className="font-semibold">
                      {blocked.blocked_profile?.display_name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{blocked.blocked_profile?.username || 'unknown'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleUnblock(
                      blocked.id,
                      blocked.blocked_profile?.username || 'user'
                    )
                  }
                  disabled={unblocking === blocked.id}
                  className="rounded-full"
                >
                  {unblocking === blocked.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Unblock'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BlockedUsers;
