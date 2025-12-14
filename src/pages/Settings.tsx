import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, UserX, Settings2, ChevronRight, 
  LogOut, Key, User, Loader2, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ username: string; display_name: string; avatar_url: string | null } | null>(null);
  const [blockedCount, setBlockedCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [profileRes, blockedRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('friendships')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('status', 'blocked'),
    ]);

    if (profileRes.data) {
      setProfile(profileRes.data);
    }
    setBlockedCount(blockedRes.count || 0);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
    toast({ title: 'Signed out successfully' });
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit Profile',
          description: 'Update your name, bio, and avatar',
          onClick: () => navigate('/'),
          badge: null,
        },
        {
          icon: Key,
          label: 'Change Password',
          description: 'Update your password',
          onClick: () => navigate('/update-password'),
          badge: null,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Notification Settings',
          description: 'Manage push notifications and alerts',
          onClick: () => navigate('/notifications'),
          badge: null,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: UserX,
          label: 'Blocked Users',
          description: 'Manage accounts you\'ve blocked',
          onClick: () => navigate('/settings/blocked'),
          badge: blockedCount > 0 ? blockedCount : null,
        },
        {
          icon: Shield,
          label: 'Privacy Settings',
          description: 'Control who can see your content',
          onClick: () => toast({ title: 'Coming soon', description: 'Privacy settings are being built' }),
          badge: null,
        },
      ],
    },
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
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Profile Summary */}
        {profile && (
          <motion.div 
            className="glass rounded-3xl p-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4">
              <img
                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                alt={profile.display_name}
                className="w-16 h-16 rounded-2xl"
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-lg truncate">{profile.display_name}</h2>
                <p className="text-muted-foreground text-sm">@{profile.username}</p>
                <p className="text-muted-foreground text-xs mt-1 truncate">{user?.email || user?.phone}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <motion.section
            key={section.title}
            className="glass rounded-3xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 }}
          >
            <div className="p-4 border-b border-border/30">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {section.title}
              </h3>
            </div>
            <div className="divide-y divide-border/20">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left active:scale-[0.99]"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge !== null && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </motion.section>
        ))}

        {/* Sign Out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            className="w-full h-14 gap-3 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </motion.div>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          woup v1.0.0
        </p>
      </main>
    </div>
  );
};

export default SettingsPage;
