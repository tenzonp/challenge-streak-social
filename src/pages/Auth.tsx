import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().email('invalid email address').max(255),
  password: z.string().min(6, 'password must be at least 6 characters').max(100),
  username: z.string().min(3, 'username must be at least 3 characters').max(30).optional(),
  displayName: z.string().min(1, 'display name is required').max(50).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    // Validate
    const validation = authSchema.safeParse({
      email,
      password,
      username: isLogin ? undefined : username,
      displayName: isLogin ? undefined : displayName,
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
      if (isLogin) {
        const { error } = await signIn(email, password);
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
      } else {
        const { error } = await signUp(email, password, username, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "email already exists",
              description: "try logging in instead",
              variant: "destructive",
            });
          } else {
            toast({
              title: "signup failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "welcome to woup! 🚀",
            description: "your account is ready, let's go!",
          });
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold text-gradient-primary mb-2">woup</h1>
        <p className="text-muted-foreground">challenge your friends, be real ✨</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm glass rounded-3xl p-6 animate-scale-in">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">
            {isLogin ? 'welcome back' : 'join the fun'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
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
                  className="w-full p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
                  maxLength={50}
                />
                {errors.displayName && <p className="text-destructive text-xs mt-1">{errors.displayName}</p>}
              </div>
            </>
          )}

          <div>
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors"
              maxLength={255}
            />
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-2xl bg-muted/50 border border-border focus:border-primary outline-none transition-colors pr-12"
              maxLength={100}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          <Button 
            type="submit" 
            variant="neon" 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isLogin ? 'log in' : 'sign up'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? "don't have an account? " : "already have an account? "}
            <span className="text-primary font-semibold">
              {isLogin ? 'sign up' : 'log in'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
