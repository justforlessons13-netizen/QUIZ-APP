import { motion } from 'framer-motion';

export function GradingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xl font-bold text-muted-foreground animate-pulse">
        Grading answers...
      </p>
      <p className="text-sm text-muted-foreground">The host is reviewing submissions</p>
    </motion.div>
  );
}
