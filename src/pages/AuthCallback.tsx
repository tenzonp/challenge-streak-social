import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          setStatus('error');
          setErrorMessage(errorDescription || 'Authentication failed');
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Get the session - Supabase handles the code exchange automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setStatus('error');
          setErrorMessage(sessionError.message);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (session) {
          setStatus('success');
          setTimeout(() => navigate('/'), 1000);
        } else {
          // No session yet, wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              setStatus('success');
              setTimeout(() => navigate('/'), 1000);
              subscription.unsubscribe();
            }
          });

          // Timeout if nothing happens
          setTimeout(() => {
            if (status === 'loading') {
              setStatus('error');
              setErrorMessage('Authentication timed out. Please try again.');
              setTimeout(() => navigate('/auth'), 2000);
            }
          }, 10000);
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        {status === 'loading' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              <Loader2 className="w-12 h-12 text-primary" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">signing you in...</h1>
              <p className="text-muted-foreground">just a moment while we complete your login</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">you're in!</h1>
              <p className="text-muted-foreground">redirecting you now...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">oops, something went wrong</h1>
              <p className="text-muted-foreground">{errorMessage}</p>
              <p className="text-sm text-muted-foreground">redirecting to login...</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AuthCallback;
