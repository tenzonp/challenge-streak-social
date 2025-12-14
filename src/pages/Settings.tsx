import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bell, UserX, Settings2, ChevronRight, 
  LogOut, Key, User, Loader2, Shield, Trash2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({ title: 'Please type DELETE to confirm', variant: 'destructive' });
      return;
    }

    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) {
        throw error;
      }

      if (data?.success) {
        await signOut();
        navigate('/auth');
        toast({ title: 'Account deleted', description: 'Your account has been permanently deleted' });
      } else {
        throw new Error(data?.error || 'Failed to delete account');
      }
    } catch (err: any) {
      console.error('Delete account error:', err);
      toast({ 
        title: 'Failed to delete account', 
        description: err.message || 'Please try again later',
        variant: 'destructive' 
      });
    } finally {
      setDeleting(false);
      setDeleteConfirmText('');
    }
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: Key,
          label: 'Change Password',
          description: 'Update your password',
          onClick: () => navigate('/update-password'),
          badge: null,
          color: 'text-primary',
          bgColor: 'bg-primary/20',
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
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/20',
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Shield,
          label: 'Privacy Settings',
          description: 'Control who can see your content',
          onClick: () => navigate('/settings/privacy'),
          badge: null,
          color: 'text-green-500',
          bgColor: 'bg-green-500/20',
        },
        {
          icon: UserX,
          label: 'Blocked Users',
          description: 'Manage accounts you\'ve blocked',
          onClick: () => navigate('/settings/blocked'),
          badge: blockedCount > 0 ? blockedCount : null,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/20',
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
                  <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
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
          className="space-y-3"
        >
          <Button
            variant="outline"
            className="w-full h-14 gap-3 rounded-2xl"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>

          {/* Delete Account */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-14 gap-3 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-5 h-5" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass border-destructive/30">
              <AlertDialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <AlertDialogTitle className="text-xl">Delete Account?</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action is <strong className="text-destructive">permanent and cannot be undone</strong>. 
                    All your data will be deleted including:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>Your profile and posts</li>
                    <li>All messages and challenges</li>
                    <li>Streaks and achievements</li>
                    <li>Friend connections</li>
                  </ul>
                  <div className="pt-2">
                    <label className="text-sm font-medium">
                      Type <span className="text-destructive font-bold">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="Type DELETE"
                      className="w-full mt-2 p-3 rounded-xl bg-muted/50 border border-border focus:border-destructive outline-none"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
