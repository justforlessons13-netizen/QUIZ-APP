import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, SkipForward, Loader2, BookOpenText, Quote, EyeOff } from 'lucide-react';
import { BeePlayer, BeeWord } from '@/types/bee';
import { cn } from '@/lib/utils';

interface BeeWordCycleProps {
  word: BeeWord;
  player: BeePlayer;
  hintsUsed: Array<'definition' | 'sentence'>;
  onRequestHint: (type: 'definition' | 'sentence') => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  onSkip: () => void;
  onSubstituteWord: () => void;
}

export function BeeWordCycle({
  word, player, hintsUsed, onRequestHint, onCorrect, onIncorrect, onSkip, onSubstituteWord,
}: BeeWordCycleProps) {
  const definitionRevealed = hintsUsed.includes('definition');
  const sentenceRevealed = hintsUsed.includes('sentence');
  const [manualGrading, setManualGrading] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-10 px-4"
    >
      <div className="text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-[3px] font-sugo">Speller</p>
        <h2 className="text-xl font-bungee text-primary uppercase tracking-wide">{player.name}</h2>
      </div>

      <div className="w-full p-6 rounded-2xl border border-border bg-card text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-4xl font-bungee text-white tracking-wide break-words">{word.word}</h1>
          {word.partOfSpeech && (
            <span className="text-xs italic text-muted-foreground self-end mb-2">{word.partOfSpeech}</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onRequestHint('definition')}
            className={cn(
              'group flex items-center justify-center gap-2 py-3 px-3 rounded-xl border font-bungee text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200',
              definitionRevealed
                ? 'bg-sky-500/25 border-sky-400/60 text-sky-200 hover:bg-sky-500/35 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_20px_-8px_rgba(56,189,248,0.9)]'
                : 'bg-sky-500/15 border-sky-400/40 text-sky-300 hover:bg-sky-500/25 hover:border-sky-400/60 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_20px_-10px_rgba(56,189,248,0.8)]'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-colors',
                definitionRevealed ? 'bg-sky-400/30' : 'bg-sky-400/20 group-hover:bg-sky-400/30'
              )}
            >
              {definitionRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <BookOpenText className="w-3.5 h-3.5" />}
            </span>
            {definitionRevealed ? 'Hide definition' : 'Reveal definition'}
          </button>

          <button
            onClick={() => onRequestHint('sentence')}
            disabled={!word.exampleSentence}
            className={cn(
              'group flex items-center justify-center gap-2 py-3 px-3 rounded-xl border font-bungee text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200',
              !word.exampleSentence
                ? 'bg-white/5 border-white/10 text-muted-foreground/30 cursor-not-allowed'
                : sentenceRevealed
                ? 'bg-fuchsia-500/25 border-fuchsia-400/60 text-fuchsia-200 hover:bg-fuchsia-500/35 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_20px_-8px_rgba(232,121,249,0.9)]'
                : 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-300 hover:bg-fuchsia-500/25 hover:border-fuchsia-400/60 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_20px_-10px_rgba(232,121,249,0.8)]'
            )}
          >
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full shrink-0 transition-colors',
                !word.exampleSentence
                  ? 'bg-white/5'
                  : sentenceRevealed
                  ? 'bg-fuchsia-400/30'
                  : 'bg-fuchsia-400/20 group-hover:bg-fuchsia-400/30'
              )}
            >
              {sentenceRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Quote className="w-3.5 h-3.5" />}
            </span>
            {sentenceRevealed ? 'Hide sentence' : 'Use in a sentence'}
          </button>
        </div>

        {definitionRevealed && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-muted-foreground pt-1"
          >
            {word.definition}
          </motion.p>
        )}

        {sentenceRevealed && word.exampleSentence && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-foreground/70 italic pt-2 border-t border-border/60 mt-3"
          >
            "{word.exampleSentence}"
          </motion.p>
        )}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest font-sugo">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Waiting for {player.name} to answer on the stage device…
      </div>

      {manualGrading ? (
        <div className="w-full grid grid-cols-2 gap-3">
          <button
            onClick={onCorrect}
            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-success/15 border border-success/30 text-success font-bungee text-sm uppercase tracking-wider hover:bg-success/25 transition-colors"
          >
            <Check className="w-5 h-5" />
            Correct
          </button>
          <button
            onClick={onIncorrect}
            className="flex items-center justify-center gap-2 py-4 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive font-bungee text-sm uppercase tracking-wider hover:bg-destructive/25 transition-colors"
          >
            <X className="w-5 h-5" />
            Incorrect
          </button>
        </div>
      ) : (
        <button
          onClick={() => setManualGrading(true)}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
        >
          Device unavailable? Grade manually
        </button>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={onSkip}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip speller
        </button>
        <span className="text-muted-foreground/30">·</span>
        <button
          onClick={onSubstituteWord}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Wrong word? Substitute
        </button>
      </div>
    </motion.div>
  );
}
