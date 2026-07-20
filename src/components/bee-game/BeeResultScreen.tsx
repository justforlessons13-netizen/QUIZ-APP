import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, X, MinusCircle, ArrowRight } from 'lucide-react';
import { BeePlayer, BeeWord } from '@/types/bee';
import { playCorrect, playIncorrect } from '@/lib/sounds';

interface BeeResultScreenProps {
  player: BeePlayer;
  word: BeeWord;
  correct: boolean | null; // null = skipped
  elapsedMs: number | null;
  onNext: () => void;
  onOverride: (correct: boolean) => void;
}

function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
}

export function BeeResultScreen({ player, word, correct, elapsedMs, onNext, onOverride }: BeeResultScreenProps) {
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    if (correct === true) playCorrect(true);
    else if (correct === false) playIncorrect(true);
  }, [correct]);

  const config = correct === true
    ? { icon: Check, label: 'Correct!', color: 'text-success', bg: 'bg-success/15', border: 'border-success/30' }
    : correct === false
      ? { icon: X, label: 'Incorrect', color: 'text-destructive', bg: 'bg-destructive/15', border: 'border-destructive/30' }
      : { icon: MinusCircle, label: 'Skipped', color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-border' };

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-16 px-4 text-center"
    >
      <div className={`w-20 h-20 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}>
        <Icon className={`w-10 h-10 ${config.color}`} />
      </div>

      <div>
        <h1 className={`text-3xl font-bungee uppercase tracking-wide ${config.color}`}>{config.label}</h1>
        <p className="text-muted-foreground text-sm mt-1 font-sugo uppercase tracking-widest">{player.name}</p>
        {elapsedMs !== null && (
          <p className="text-muted-foreground/70 text-xs mt-1">{formatElapsed(elapsedMs)}</p>
        )}
      </div>

      <div className="p-4 rounded-xl border border-border bg-card w-full">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">The word was</p>
        <p className="text-2xl font-bungee text-white tracking-wide">{word.word}</p>
      </div>

      {correct !== null && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground/60">Auto-graded wrong?</span>
          {correct === true ? (
            <button
              onClick={() => onOverride(false)}
              className="text-destructive/80 hover:text-destructive underline underline-offset-2"
            >
              Actually incorrect
            </button>
          ) : (
            <button
              onClick={() => onOverride(true)}
              className="text-success/80 hover:text-success underline underline-offset-2"
            >
              Actually correct
            </button>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        className="relative bg-transparent border-2 border-primary rounded-xl py-3 px-8 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors shadow-2xl"
      >
        Next Speller
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
