import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Eye, EyeOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface ChatLockProps {
  chatId: string;
  onUnlock: () => void;
  isLocked: boolean;
  onSetLock: (password: string | null) => void;
}

const STORAGE_KEY_PREFIX = 'chat_lock_';

export const useChatLock = (chatId: string) => {
  const [isLocked, setIsLocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    const storedHash = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chatId}`);
    setHasPassword(!!storedHash);
    setIsLocked(!!storedHash);
  }, [chatId]);

  const setLock = useCallback((password: string | null) => {
    if (password) {
      // Simple hash (in production, use proper crypto)
      const hash = btoa(password);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${chatId}`, hash);
      setHasPassword(true);
      setIsLocked(true);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${chatId}`);
      setHasPassword(false);
      setIsLocked(false);
    }
  }, [chatId]);

  const unlock = useCallback((password: string): boolean => {
    const storedHash = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chatId}`);
    if (!storedHash) return true;
    
    const inputHash = btoa(password);
    if (inputHash === storedHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [chatId]);

  return { isLocked, hasPassword, setLock, unlock };
};

export const ChatLockScreen = ({ chatId, onUnlock }: { chatId: string; onUnlock: () => void }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const { toast } = useToast();
  const { unlock } = useChatLock(chatId);

  const handleUnlock = () => {
    if (unlock(password)) {
      onUnlock();
      toast({ title: 'Chat unlocked! 🔓' });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast({ title: 'Wrong password', variant: 'destructive' });
      setPassword('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center p-8"
    >
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-6 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 mx-auto rounded-full gradient-primary flex items-center justify-center"
        >
          <Lock className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        
        <div>
          <h2 className="text-2xl font-bold mb-2">Chat Locked</h2>
          <p className="text-muted-foreground">Enter password to unlock this conversation</p>
        </div>

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="pr-10 text-center text-lg tracking-widest"
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Button onClick={handleUnlock} variant="neon" size="lg" className="w-full gap-2">
          <Unlock className="w-5 h-5" /> Unlock
        </Button>
      </motion.div>
    </motion.div>
  );
};

export const ChatLockSettings = ({ chatId, onClose }: { chatId: string; onClose: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { hasPassword, setLock } = useChatLock(chatId);
  const { toast } = useToast();

  const handleSetLock = () => {
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 4) {
      toast({ title: 'Password must be at least 4 characters', variant: 'destructive' });
      return;
    }
    setLock(password);
    toast({ title: 'Chat locked! 🔒' });
    onClose();
  };

  const handleRemoveLock = () => {
    setLock(null);
    toast({ title: 'Chat lock removed' });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="glass rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl gradient-secondary flex items-center justify-center">
          <Shield className="w-5 h-5 text-secondary-foreground" />
        </div>
        <div>
          <h3 className="font-bold">Chat Lock</h3>
          <p className="text-xs text-muted-foreground">
            {hasPassword ? 'This chat is protected' : 'Add a password to protect this chat'}
          </p>
        </div>
      </div>

      {hasPassword ? (
        <Button onClick={handleRemoveLock} variant="destructive" className="w-full">
          Remove Lock
        </Button>
      ) : (
        <>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
          />
          <Button onClick={handleSetLock} variant="neon" className="w-full gap-2">
            <Lock className="w-4 h-4" /> Set Lock
          </Button>
        </>
      )}
    </motion.div>
  );
};

export default ChatLockScreen;
