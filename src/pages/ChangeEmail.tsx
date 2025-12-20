import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { z } from 'zod';

const emailSchema = z.string().email('please enter a valid email address');

const ChangeEmail = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = emailSchema.safeParse(newEmail);
    if (!validation.success) {
      setError('please enter a valid email address');
      return;
    }

    if (newEmail.toLowerCase().trim() === user?.email?.toLowerCase()) {
      setError('this is already your current email');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail.toLowerCase().trim(),
      });

      if (updateError) {
        if (updateError.message.includes('already registered')) {
          setError('this email is already registered to another account');
        } else {
          toast({
            title: "error",
            description: updateError.message,
            variant: "destructive",
          });
        }
      } else {
        setSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          
          <h2 className="text-2xl font-bold mb-2">check both inboxes! 📧</h2>
          <p className="text-muted-foreground mb-4">
            we sent confirmation links to:
          </p>
          <div className="space-y-2 mb-6">
            <p className="text-foreground font-medium break-all text-sm">
              {user?.email} (current)
            </p>
            <p className="text-foreground font-medium break-all text-sm">
              {newEmail} (new)
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            click the links in both emails to complete the change
          </p>
          
          <Button
            variant="neon"
            onClick={() => navigate('/settings')}
            className="w-full h-12 text-base font-bold"
          >
            back to settings
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/settings')} 
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Change Email</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-md">
        <motion.div 
          className="glass rounded-3xl p-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-6">
            <p className="text-muted-foreground text-sm">
              current email
            </p>
            <p className="font-medium break-all">
              {user?.email}
            </p>
          </div>

          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                New email address
              </label>
              <input
                type="email"
                placeholder="Enter new email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-4 rounded-2xl bg-muted/50 border border-border/50 focus:border-primary outline-none transition-all"
              />
              {error && <p className="text-destructive text-xs mt-1">{error}</p>}
            </div>

            <p className="text-xs text-muted-foreground">
              you'll receive a confirmation email at both your current and new email addresses. 
              click the link in both to complete the change.
            </p>

            <Button 
              type="submit" 
              variant="neon" 
              className="w-full h-12 text-base font-bold"
              disabled={loading || !newEmail}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "send confirmation"
              )}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default ChangeEmail;
