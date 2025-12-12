import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  displayName: string;
  colorPrimary?: string;
}

const TypingIndicator = ({ displayName, colorPrimary }: TypingIndicatorProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 px-4 py-2"
    >
      <div 
        className="flex items-center gap-1 px-4 py-2.5 rounded-3xl rounded-bl-lg bg-muted/80"
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: colorPrimary || 'hsl(var(--primary))' }}
        />
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: colorPrimary || 'hsl(var(--primary))' }}
        />
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: colorPrimary || 'hsl(var(--primary))' }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {displayName.split(' ')[0]} is typing...
      </span>
    </motion.div>
  );
};

export default TypingIndicator;