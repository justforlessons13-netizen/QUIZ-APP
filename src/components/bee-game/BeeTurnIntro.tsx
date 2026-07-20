import { motion } from 'framer-motion';
import { Mic, ArrowRight } from 'lucide-react';
import { BeePlayer } from '@/types/bee';

interface BeeTurnIntroProps {
  player: BeePlayer;
  round: number;
  wordNumber: number;
  totalWords: number;
  onReveal: () => void;
}

export function BeeTurnIntro({ player, round, wordNumber, totalWords, onReveal }: BeeTurnIntroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center justify-center gap-8 py-16 px-4 text-center"
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[2px] text-muted-foreground font-sugo">
        Round {round} · Word {wordNumber} of {totalWords}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Mic className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[3px] font-sugo mb-1">Up Next</p>
          <h1 className="text-4xl font-bungee text-white uppercase tracking-wide">{player.name}</h1>
        </div>
      </div>

      <button
        onClick={onReveal}
        className="relative bg-transparent border-2 border-primary rounded-xl py-3 px-8 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 animate-borderPulse hover:bg-primary/10 transition-colors shadow-2xl"
      >
        Reveal Word
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
