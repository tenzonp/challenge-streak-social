import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Users, Flame, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface PrivacySettings {
  post_visibility: 'everyone' | 'friends_only' | 'private';
  who_can_challenge: 'everyone' | 'friends_only' | 'no_one';
  show_streak_publicly: boolean;
  show_spotify_publicly: boolean;
}

const PrivacySettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    post_visibility: 'everyone',
    who_can_challenge: 'friends_only',
    show_streak_publicly: true,
    show_spotify_publicly: true,
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        post_visibility: data.post_visibility as PrivacySettings['post_visibility'],
        who_can_challenge: data.who_can_challenge as PrivacySettings['who_can_challenge'],
        show_streak_publicly: data.show_streak_publicly,
        show_spotify_publicly: data.show_spotify_publicly,
      });
    } else if (!error) {
      // No settings exist, create default
      const { error: insertError } = await supabase
        .from('privacy_settings')
        .insert({ user_id: user.id });
      
      if (insertError) {
        console.error('Error creating privacy settings:', insertError);
      }
    }
    setLoading(false);
  };

  const updateSetting = async <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    if (!user) return;
    
    const previousSettings = { ...settings };
    setSaving(true);
    setSettings(prev => ({ ...prev, [key]: value }));

    // First check if record exists
    const { data: existing } = await supabase
      .from('privacy_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let error;
    if (existing) {
      // Update existing record
      const result = await supabase
        .from('privacy_settings')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      error = result.error;
    } else {
      // Insert new record with the setting
      const result = await supabase
        .from('privacy_settings')
        .insert({ user_id: user.id, [key]: value });
      error = result.error;
    }

    if (error) {
      console.error('Error saving privacy setting:', error);
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      setSettings(previousSettings);
    } else {
      toast({ title: 'Saved' });
    }
    setSaving(false);
  };

  const visibilityOptions = [
    { value: 'everyone', label: 'Everyone', desc: 'Anyone can see your posts' },
    { value: 'friends_only', label: 'Friends Only', desc: 'Only your friends can see' },
    { value: 'private', label: 'Private', desc: 'Only you can see your posts' },
  ];

  const challengeOptions = [
    { value: 'everyone', label: 'Everyone', desc: 'Anyone can send you challenges' },
    { value: 'friends_only', label: 'Friends Only', desc: 'Only friends can challenge you' },
    { value: 'no_one', label: 'No One', desc: 'Disable incoming challenges' },
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
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Privacy Settings</h1>
          </div>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Post Visibility */}
        <motion.section
          className="glass rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-4 border-b border-border/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Post Visibility</h3>
              <p className="text-sm text-muted-foreground">Who can see your posts</p>
            </div>
          </div>
          <div className="divide-y divide-border/20">
            {visibilityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateSetting('post_visibility', option.value as PrivacySettings['post_visibility'])}
                className={`w-full flex items-center justify-between p-4 transition-colors ${
                  settings.post_visibility === option.value ? 'bg-primary/10' : 'hover:bg-muted/30'
                }`}
              >
                <div className="text-left">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  settings.post_visibility === option.value 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`}>
                  {settings.post_visibility === option.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Challenge Settings */}
        <motion.section
          className="glass rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-4 border-b border-border/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold">Who Can Challenge You</h3>
              <p className="text-sm text-muted-foreground">Control who can send you challenges</p>
            </div>
          </div>
          <div className="divide-y divide-border/20">
            {challengeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => updateSetting('who_can_challenge', option.value as PrivacySettings['who_can_challenge'])}
                className={`w-full flex items-center justify-between p-4 transition-colors ${
                  settings.who_can_challenge === option.value ? 'bg-primary/10' : 'hover:bg-muted/30'
                }`}
              >
                <div className="text-left">
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  settings.who_can_challenge === option.value 
                    ? 'border-primary bg-primary' 
                    : 'border-muted-foreground'
                }`}>
                  {settings.who_can_challenge === option.value && (
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Additional Privacy Toggles */}
        <motion.section
          className="glass rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="p-4 border-b border-border/30">
            <h3 className="font-semibold">Profile Visibility</h3>
            <p className="text-sm text-muted-foreground">Control what others can see on your profile</p>
          </div>
          <div className="divide-y divide-border/20">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Show Streak Publicly</p>
                  <p className="text-sm text-muted-foreground">Let others see your streak count</p>
                </div>
              </div>
              <Switch
                checked={settings.show_streak_publicly}
                onCheckedChange={(checked) => updateSetting('show_streak_publicly', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Show Music Status</p>
                  <p className="text-sm text-muted-foreground">Let others see what you're listening to</p>
                </div>
              </div>
              <Switch
                checked={settings.show_spotify_publicly}
                onCheckedChange={(checked) => updateSetting('show_spotify_publicly', checked)}
              />
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default PrivacySettingsPage;
