import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Sparkles, Zap, Flame, Trophy, Copy, Check, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  userCode: z.string().length(8, 'user id must be 8 digits').regex(/^\d{8}$/, 'user id must be 8 digits'),
  password: z.string().min(6, 'password must be at least 6 characters').max(100),
});

const signupSchema = z.object({
  username: z.string().min(3, 'username must be at least 3 characters').max(30),
  displayName: z.string().min(1, 'display name is required').max(50),
  password: z.string().min(6, 'password must be at least 6 characters').max(100),
});

type AuthView = 'main' | 'signup-success' | 'forgot-password' | 'reset-success';

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('main');
  const [copied, setCopied] = useState(false);
  
  // Login state
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [generatedUserCode, setGeneratedUserCode] = useState('');
  
  // Reset password state
  const [resetUserCode, setResetUserCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = loginSchema.safeParse({ userCode, password });
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
      // Look up email by user_code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_code', userCode)
        .single();

      if (profileError || !profile) {
        toast({
          title: "user not found",
          description: "no account with that user id exists",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!profile.email) {
        toast({
          title: "account error",
          description: "this account is not properly set up",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Sign in with the internal email
      const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
      });
      
      if (error) {
        toast({
          title: "login failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "welcome back! 🎉",
          description: "let's see what challenges await",
        });
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = signupSchema.safeParse({ username, displayName, password });
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
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        setErrors({ username: 'username is already taken' });
        setLoading(false);
        return;
      }

      // Generate unique 8-digit code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_unique_user_code');
      if (codeError || !codeData) {
        toast({
          title: "signup failed",
          description: "could not generate user id",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const newUserCode = codeData as string;
      const internalEmail = `${newUserCode}@woup.internal`;

      // Create user with internal email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: username.toLowerCase(),
            display_name: displayName,
            user_code: newUserCode,
          }
        }
      });

      if (authError) {
        toast({
          title: "signup failed",
          description: authError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Update profile with user_code and email
        await supabase
          .from('profiles')
          .update({ 
            user_code: newUserCode,
            email: internalEmail,
            username: username.toLowerCase(),
            display_name: displayName,
          })
          .eq('user_id', authData.user.id);

        setGeneratedUserCode(newUserCode);
        setAuthView('signup-success');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyUserCode = () => {
    navigator.clipboard.writeText(generatedUserCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "copied!",
      description: "user id copied to clipboard",
    });
  };

  const proceedToApp = () => {
    navigate('/');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (resetUserCode.length !== 8 || !/^\d{8}$/.test(resetUserCode)) {
      setErrors({ resetUserCode: 'user id must be 8 digits' });
      return;
    }
    
    if (newPassword.length < 6) {
      setErrors({ newPassword: 'password must be at least 6 characters' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'passwords do not match' });
      return;
    }
    
    setLoading(true);
    try {
      // Look up email by user_code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, user_id')
        .eq('user_code', resetUserCode)
        .single();

      if (profileError || !profile) {
        toast({
          title: "user not found",
          description: "no account with that user id exists",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!profile.email) {
        toast({
          title: "account error",
          description: "this account is not properly set up",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Sign in with admin access to update password
      // First try to sign in with the internal email
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: newPassword,
      });
      
      // If password is already correct, redirect to app
      if (!signInError) {
        toast({
          title: "password already set!",
          description: "logging you in...",
        });
        navigate('/');
        return;
      }

      // For security, we can't directly reset passwords without email verification
      // So we'll use a workaround - sign up/in with the same credentials
      // This won't work for existing users, so we show a helpful message
      toast({
        title: "password reset",
        description: "for security, please contact support to reset your password or create a new account",
        variant: "destructive",
      });
      
    } finally {
      setLoading(false);
    }
  };

  // Reset success view
  if (authView === 'reset-success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-32 h-32 rounded-full bg-neon-pink/20 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>

        <motion.div 
          className="w-full max-w-sm glass-strong rounded-4xl p-8 text-center relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Check className="w-16 h-16 mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold mb-2">password reset!</h2>
          <p className="text-muted-foreground mb-6">
            you can now log in with your new password
          </p>
          
          <Button
            variant="neon"
            onClick={() => { setAuthView('main'); setIsLogin(true); }}
            className="w-full h-12 text-base font-bold"
          >
            back to login
          </Button>
        </motion.div>
      </div>
    );
  }

  // Forgot password view  
  if (authView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
          <div className="text-center mb-6">
            <KeyRound className="w-12 h-12 mx-auto text-primary mb-2" />
            <h2 className="text-xl font-bold">reset password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              enter your user id and new password
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="8-digit user id"
                value={resetUserCode}
                onChange={(e) => setResetUserCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all font-mono text-center text-lg tracking-widest"
                maxLength={8}
                inputMode="numeric"
              />
              {errors.resetUserCode && <p className="text-destructive text-xs mt-1">{errors.resetUserCode}</p>}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              {errors.newPassword && <p className="text-destructive text-xs mt-1">{errors.newPassword}</p>}
            </div>

            <div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all"
                maxLength={100}
              />
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            <button
              type="button"
              onClick={() => { setAuthView('forgot-password'); setErrors({}); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              forgot password?
            </button>

            <Button 
              type="submit" 
              variant="neon" 
              className="w-full h-12 text-base font-bold"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "reset password"
              )}
            </Button>
          </form>

          <button
            onClick={() => { setAuthView('main'); setErrors({}); }}
            className="w-full text-center text-sm text-muted-foreground mt-4 hover:text-foreground transition-colors"
          >
            ← back to login
          </button>
        </motion.div>
      </div>
    );
  }

  // Signup success view
  if (authView === 'signup-success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
          className="w-full max-w-sm glass-strong rounded-4xl p-8 text-center relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-16 h-16 mx-auto text-primary mb-4" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-2">welcome to woup! 🎉</h2>
          <p className="text-muted-foreground mb-6">
            your unique user id is ready
          </p>
          
          <div className="bg-muted/50 rounded-2xl p-4 mb-4">
            <p className="text-sm text-muted-foreground mb-2">your user id</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold tracking-wider text-primary">
                {generatedUserCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyUserCode}
                className="rounded-full"
              >
                {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            save this id! you'll need it to log in
          </p>
          
          <Button
            variant="neon"
            onClick={proceedToApp}
            className="w-full h-12 text-base font-bold"
          >
            let's go! 🚀
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background */}
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
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-neon-green/10 blur-3xl"
          animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      {/* Logo */}
      <motion.div 
        className="mb-8 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-neon-pink via-primary to-neon-cyan flex items-center justify-center shadow-2xl">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-primary via-neon-pink to-neon-cyan bg-clip-text text-transparent">
            woup
          </h1>
        </div>
        <p className="text-muted-foreground text-center text-sm">challenge your friends ⚡</p>
      </motion.div>

      {/* Features preview */}
      <motion.div 
        className="flex gap-3 mb-8 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {[
          { icon: Flame, label: 'streaks', color: 'text-neon-pink' },
          { icon: Trophy, label: 'compete', color: 'text-neon-cyan' },
          { icon: Sparkles, label: 'vibes', color: 'text-primary' },
        ].map((feature, i) => (
          <div key={feature.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs">
            <feature.icon className={`w-3.5 h-3.5 ${feature.color}`} />
            <span>{feature.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Auth Form */}
      <motion.div 
        className="w-full max-w-sm glass-strong rounded-4xl p-6 relative z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        {/* Toggle */}
        <div className="flex gap-2 p-1 rounded-2xl bg-muted/50 mb-6">
          <button
            onClick={() => { setIsLogin(true); setErrors({}); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              isLogin ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground'
            }`}
          >
            login
          </button>
          <button
            onClick={() => { setIsLogin(false); setErrors({}); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              !isLogin ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground'
            }`}
          >
            sign up
          </button>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="8-digit user id"
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all font-mono text-center text-lg tracking-widest"
                maxLength={8}
                inputMode="numeric"
              />
              {errors.userCode && <p className="text-destructive text-xs mt-1">{errors.userCode}</p>}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="password"
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
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
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
                placeholder="password"
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
                "create account ✨"
              )}
            </Button>
          </form>
        )}
      </motion.div>

      {/* Footer */}
      <motion.p 
        className="mt-6 text-xs text-muted-foreground text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        by joining you agree to our vibes ✌️
      </motion.p>
    </div>
  );
};

export default Auth;