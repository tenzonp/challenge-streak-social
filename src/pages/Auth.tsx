import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Sparkles, Zap, Flame, Trophy, Check, KeyRound, Mail } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('please enter a valid email address').max(255),
  password: z.string().min(6, 'password must be at least 6 characters').max(100),
});

const signupSchema = z.object({
  email: z.string().email('please enter a valid email address').max(255),
  username: z.string().min(3, 'username must be at least 3 characters').max(30),
  displayName: z.string().min(1, 'display name is required').max(50),
  password: z.string().min(6, 'password must be at least 6 characters').max(100),
});

type AuthView = 'main' | 'signup-success' | 'forgot-password' | 'reset-sent' | 'verify-email';

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('main');
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  
  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  
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
    
    const validation = loginSchema.safeParse({ email, password });
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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast({
            title: "email not verified",
            description: "please check your email and click the verification link",
            variant: "destructive",
          });
        } else {
          toast({
            title: "login failed",
            description: error.message,
            variant: "destructive",
          });
        }
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
    
    const validation = signupSchema.safeParse({ 
      email: signupEmail, 
      username, 
      displayName, 
      password 
    });
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

      // Check if email is already used
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', signupEmail.toLowerCase().trim())
        .single();

      if (existingEmail) {
        setErrors({ email: 'email is already registered' });
        setLoading(false);
        return;
      }

      // Create user with real email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: username.toLowerCase(),
            display_name: displayName,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErrors({ email: 'email is already registered' });
        } else {
          toast({
            title: "signup failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Update profile with email and username
        await supabase
          .from('profiles')
          .update({ 
            email: signupEmail.toLowerCase().trim(),
            username: username.toLowerCase(),
            display_name: displayName,
          })
          .eq('user_id', authData.user.id);

        setAuthView('verify-email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const emailValidation = z.string().email('please enter a valid email address');
    const result = emailValidation.safeParse(resetEmail);
    
    if (!result.success) {
      setErrors({ resetEmail: 'please enter a valid email address' });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) {
        toast({
          title: "error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setAuthView('reset-sent');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        toast({
          title: "error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "email sent!",
          description: "check your inbox for the verification link",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Email verification pending view
  if (authView === 'verify-email') {
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
            <Mail className="w-16 h-16 mx-auto text-primary mb-4" />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-2">check your email! 📧</h2>
          <p className="text-muted-foreground mb-4">
            we sent a verification link to
          </p>
          <p className="text-foreground font-medium mb-6 break-all">
            {signupEmail}
          </p>
          
          <p className="text-sm text-muted-foreground mb-6">
            click the link in the email to verify your account and start using woup
          </p>
          
          <Button
            variant="outline"
            onClick={resendVerificationEmail}
            className="w-full h-11 mb-3"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "resend email"
            )}
          </Button>
          
          <button
            onClick={() => { setAuthView('main'); setIsLogin(true); }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← back to login
          </button>
        </motion.div>
      </div>
    );
  }

  // Reset password email sent view
  if (authView === 'reset-sent') {
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
          <h2 className="text-2xl font-bold mb-2">check your email!</h2>
          <p className="text-muted-foreground mb-4">
            we sent a password reset link to
          </p>
          <p className="text-foreground font-medium mb-6 break-all">
            {resetEmail}
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
              enter your email to receive a reset link
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all"
              />
              {errors.resetEmail && <p className="text-destructive text-xs mt-1">{errors.resetEmail}</p>}
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
                "send reset link"
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center">
            <Zap className="w-6 h-6 text-background" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">woup</h1>
        </div>
        <p className="text-muted-foreground text-center text-sm">challenge your friends</p>
      </div>

      {/* Features preview */}
      <div className="flex gap-2 mb-8">
        {[
          { icon: Flame, label: 'streaks' },
          { icon: Trophy, label: 'compete' },
          { icon: Sparkles, label: 'vibes' },
        ].map((feature) => (
          <div key={feature.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs">
            <feature.icon className="w-3.5 h-3.5" />
            <span>{feature.label}</span>
          </div>
        ))}
      </div>

      {/* Auth Form */}
      <div className="w-full max-w-sm bg-card rounded-2xl p-6 border border-border">
        {/* Toggle */}
        <div className="flex gap-2 p-1 rounded-xl bg-muted mb-6">
          <button
            onClick={() => { setIsLogin(true); setErrors({}); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              isLogin ? 'bg-foreground text-background' : 'text-muted-foreground'
            }`}
          >
            login
          </button>
          <button
            onClick={() => { setIsLogin(false); setErrors({}); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
              !isLogin ? 'bg-foreground text-background' : 'text-muted-foreground'
            }`}
          >
            sign up
          </button>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-muted border border-border focus:border-foreground/50 outline-none transition-all"
              />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-muted border border-border focus:border-foreground/50 outline-none transition-all pr-12"
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

            <button
              type="button"
              onClick={() => { setAuthView('forgot-password'); setErrors({}); }}
              className="w-full text-right text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              forgot password?
            </button>

            <Button 
              type="submit" 
              className="w-full h-11 font-semibold active:scale-[0.98] transition-transform"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "let's go!"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="email address"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-muted border border-border focus:border-foreground/50 outline-none transition-all"
              />
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full p-3.5 rounded-xl bg-muted border border-border focus:border-foreground/50 outline-none transition-all"
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
                className="w-full p-3.5 rounded-xl bg-muted border border-border focus:border-foreground/50 outline-none transition-all"
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
                className="w-full p-3.5 rounded-xl bg-muted border border-border focus:border-foreground/50 outline-none transition-all pr-12"
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
              className="w-full h-11 font-semibold active:scale-[0.98] transition-transform"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "create account"
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-muted-foreground text-center">
        by joining you agree to our terms
      </p>
    </div>
  );
};

export default Auth;
