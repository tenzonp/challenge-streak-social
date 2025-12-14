import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const setupSchema = z.object({
  username: z.string().min(3, 'username must be at least 3 characters').max(30),
  displayName: z.string().min(1, 'display name is required').max(50),
  password: z.string().min(6, 'password must be at least 6 characters').max(100),
});

const SetupProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = setupSchema.safeParse({ username, displayName, password });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        setErrors({ username: 'username is already taken' });
        setLoading(false);
        return;
      }

      // Update password
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        toast({
          title: 'Failed to set password',
          description: passwordError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user!.id,
          username,
          display_name: displayName,
        });

      if (profileError) {
        toast({
          title: 'Failed to create profile',
          description: profileError.message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Welcome to woup! 🎉',
        description: 'Your profile is all set up',
      });
      navigate('/');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-32 h-32 rounded-full bg-neon-pink/20 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-32 right-10 w-40 h-40 rounded-full bg-neon-cyan/20 blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      <motion.div 
        className="w-full max-w-sm glass-strong rounded-4xl p-6 relative z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">complete your profile</h2>
        </div>
        
        <p className="text-muted-foreground text-sm text-center mb-6">
          set up your username and password to finish creating your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all"
              maxLength={30}
            />
            {errors.username && <p className="text-destructive text-xs mt-1">{errors.username}</p>}
          </div>

          <div>
            <input
              type="text"
              placeholder="display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all"
              maxLength={50}
            />
            {errors.displayName && <p className="text-destructive text-xs mt-1">{errors.displayName}</p>}
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="set password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all pr-12"
              maxLength={100}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          <Button 
            type="submit" 
            variant="neon" 
            className="w-full h-12 text-base font-bold"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "let's go! 🚀"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default SetupProfile;
