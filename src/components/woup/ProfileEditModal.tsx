import { useState } from 'react';
import { X, Camera, Palette, Music, Tag, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile, useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCamera } from '@/hooks/useCamera';

interface ProfileEditModalProps {
  profile: Profile;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#4ade80', '#22d3ee', '#f472b6', '#facc15', '#a78bfa', 
  '#fb923c', '#f87171', '#38bdf8', '#34d399', '#e879f9',
];

const INTEREST_OPTIONS = [
  '🎮 gaming', '🎵 music', '📚 books', '🎨 art', '💻 coding',
  '🏀 sports', '🎬 movies', '📸 photos', '✈️ travel', '🍕 food',
  '🎧 podcasts', '🧘 wellness', '🌱 plants', '🐕 pets', '💄 beauty',
];

const ProfileEditModal = ({ profile, onClose }: ProfileEditModalProps) => {
  const { updateProfile, refetch } = useProfile();
  const { toast } = useToast();
  const { uploadPhoto } = useCamera();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio || '');
  const [vibe, setVibe] = useState(profile.vibe || '');
  const [colorPrimary, setColorPrimary] = useState(profile.color_primary || '#4ade80');
  const [colorSecondary, setColorSecondary] = useState(profile.color_secondary || '#f472b6');
  const [interests, setInterests] = useState<string[]>(profile.interests || []);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'colors' | 'interests'>('info');

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest].slice(0, 6)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateProfile({
      display_name: displayName,
      bio,
      vibe,
      color_primary: colorPrimary,
      color_secondary: colorSecondary,
      interests,
    });

    if (error) {
      toast({
        title: 'failed to save',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'saved! ✨',
        description: 'your profile is updated',
      });
      await refetch();
      onClose();
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const url = await uploadPhoto(dataUrl, 'front');
      if (url) {
        await updateProfile({ avatar_url: url });
        await refetch();
        toast({ title: 'avatar updated! 📸' });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md h-[80vh] glass rounded-3xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-xl font-bold">edit profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-border/50 overflow-x-auto">
          {[
            { id: 'info', icon: Camera, label: 'Info' },
            { id: 'colors', icon: Palette, label: 'Colors' },
            { id: 'interests', icon: Tag, label: 'Interests' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'gradient-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'info' && (
            <>
              {/* Avatar */}
              <div className="flex justify-center">
                <label className="relative cursor-pointer group">
                  <img 
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.user_id}`}
                    className="w-24 h-24 rounded-3xl border-4"
                    style={{ borderColor: colorPrimary }}
                  />
                  <div className="absolute inset-0 rounded-3xl bg-background/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-8 h-8" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">display name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">bio</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="w-full p-3 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none resize-none h-20"
                  maxLength={150}
                  placeholder="tell us about yourself..."
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">current vibe ✨</label>
                <input
                  value={vibe}
                  onChange={e => setVibe(e.target.value)}
                  className="w-full p-3 rounded-xl bg-muted/50 border border-border focus:border-primary outline-none"
                  maxLength={30}
                  placeholder="🎧 vibing..."
                />
              </div>
            </>
          )}

          {activeTab === 'colors' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">primary color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setColorPrimary(color)}
                      className={`w-10 h-10 rounded-xl transition-transform ${colorPrimary === color ? 'scale-110 ring-2 ring-foreground' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">secondary color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setColorSecondary(color)}
                      className={`w-10 h-10 rounded-xl transition-transform ${colorSecondary === color ? 'scale-110 ring-2 ring-foreground' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${colorPrimary}, ${colorSecondary})` }}>
                <p className="text-center font-bold text-white drop-shadow-lg">preview ✨</p>
              </div>
            </>
          )}

          {activeTab === 'interests' && (
            <>
              <p className="text-sm text-muted-foreground">pick up to 6 interests</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-2 rounded-xl text-sm transition-all ${
                      interests.includes(interest)
                        ? 'gradient-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Save button */}
        <div className="p-4 border-t border-border/50">
          <Button variant="neon" className="w-full gap-2" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            save changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditModal;
