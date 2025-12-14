import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Profile } from '@/hooks/useProfile';

interface IncomingCallModalProps {
  caller: Profile;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallModal = ({ caller, onAccept, onReject }: IncomingCallModalProps) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-lg flex flex-col items-center justify-center"
      >
        {/* Caller info */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative inline-block mb-6"
          >
            <img
              src={caller.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${caller.user_id}`}
              className="w-32 h-32 rounded-3xl"
              style={{ 
                borderColor: caller.color_primary || 'hsl(var(--primary))',
                borderWidth: 4
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-3xl border-4"
              style={{ borderColor: caller.color_primary || 'hsl(var(--primary))' }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </motion.div>
          
          <h2 className="text-2xl font-bold mb-2">{caller.display_name}</h2>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Phone className="w-4 h-4 animate-pulse" />
            Incoming video call...
          </p>
        </motion.div>

        {/* Accept/Reject buttons */}
        <div className="flex items-center gap-8">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full"
              onClick={onReject}
              type="button"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            <p className="text-sm text-muted-foreground mt-2">Decline</p>
          </motion.div>
          
          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white"
              onClick={onAccept}
              type="button"
            >
              <Phone className="w-7 h-7" />
            </Button>
            <p className="text-sm text-muted-foreground mt-2">Accept</p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default IncomingCallModal;
