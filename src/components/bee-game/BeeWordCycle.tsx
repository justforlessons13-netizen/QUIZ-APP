// Rewritten to match "Bee Host Game" mockup exactly: card border/glow alpha,
// hint button active/inactive colors, and border weight all now use the
// mockup's literal oklch(80% 0.16 92 / X) values instead of hex-suffix approximations.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, SkipForward, Loader2 } from 'lucide-react';
import { BeePlayer, BeeWord } from '@/types/bee';

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

const GOLD = 'oklch(80% 0.16 92)';
const GOLD_DIM = 'oklch(70% 0.02 92)';

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
      className="w-full max-w-[600px] mx-auto flex flex-col items-center gap-6 text-center"
      style={{ paddingTop: 40, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 }}
    >
      <div className="uppercase tracking-[.15em]" style={{ fontSize: 12, color: GOLD_DIM }}>
        {player.name}'s word
      </div>

      <div
        className="w-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid oklch(80% 0.16 92 / .3)',
          borderRadius: 24,
          padding: '44px 30px',
          boxShadow: '0 20px 60px rgba(0,0,0,.35)',
        }}
      >
        <h1
          className="font-bungee break-words"
          style={{ fontSize: 56, color: GOLD, textTransform: 'uppercase', textShadow: '0 0 30px oklch(80% 0.16 92 / .3)', lineHeight: 1.1, letterSpacing: '0.04em' }}
        >
          {word.word}
        </h1>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onRequestHint('definition')}
          className="font-bungee uppercase transition-[filter] hover:brightness-110 active:scale-95"
          style={{
            padding: '12px 22px',
            borderRadius: 10,
            background: definitionRevealed ? 'oklch(80% 0.16 92 / .25)' : 'rgba(255,255,255,.05)',
            border: '1.5px solid oklch(80% 0.16 92 / .4)',
            color: '#fff',
            fontSize: 11,
          }}
        >
          Definition
        </button>
        <button
          onClick={() => onRequestHint('sentence')}
          disabled={!word.exampleSentence}
          className="font-bungee uppercase transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            padding: '12px 22px',
            borderRadius: 10,
            background: sentenceRevealed ? 'oklch(80% 0.16 92 / .25)' : 'rgba(255,255,255,.05)',
            border: '1.5px solid oklch(80% 0.16 92 / .4)',
            color: '#fff',
            fontSize: 11,
          }}
        >
          Use in sentence
        </button>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 w-full" style={{ minHeight: 70 }}>
        {definitionRevealed && (
          <motion.p key="def" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 16, color: 'oklch(85% 0.01 195)', maxWidth: 460 }}>
            {word.definition}
          </motion.p>
        )}
        {sentenceRevealed && word.exampleSentence && (
          <motion.p key="sent" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 16, color: 'oklch(85% 0.01 195)', maxWidth: 460, fontStyle: 'italic' }}>
            "{word.exampleSentence}"
          </motion.p>
        )}
      </div>

      <div className="flex items-center gap-2 uppercase tracking-[.1em]" style={{ fontSize: 12, color: GOLD_DIM }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        Waiting for {player.name} to answer on the stage device…
      </div>

      {manualGrading ? (
        <div className="w-full grid grid-cols-2 gap-3" style={{ maxWidth: 420 }}>
          <button
            onClick={onCorrect}
            className="flex items-center justify-center gap-2 py-4 rounded-xl font-bungee text-sm uppercase tracking-wider transition-[filter] hover:brightness-110"
            style={{ background: 'oklch(55% 0.18 145 / .2)', border: '1px solid oklch(55% 0.18 145 / .4)', color: 'oklch(70% 0.15 145)' }}
          >
            <Check className="w-5 h-5" /> Correct
          </button>
          <button
            onClick={onIncorrect}
            className="flex items-center justify-center gap-2 py-4 rounded-xl font-bungee text-sm uppercase tracking-wider transition-[filter] hover:brightness-110"
            style={{ background: 'oklch(55% 0.2 25 / .2)', border: '1px solid oklch(55% 0.2 25 / .4)', color: 'oklch(70% 0.2 25)' }}
          >
            <X className="w-5 h-5" /> Incorrect
          </button>
        </div>
      ) : (
        <button
          onClick={() => setManualGrading(true)}
          className="underline underline-offset-2 transition-opacity hover:opacity-80"
          style={{ fontSize: 12, color: GOLD_DIM }}
        >
          Device unavailable? Grade manually
        </button>
      )}

      <div className="flex items-center gap-4">
        <button onClick={onSkip} className="flex items-center gap-1.5 transition-opacity hover:opacity-80" style={{ fontSize: 12, color: GOLD_DIM }}>
          <SkipForward className="w-3.5 h-3.5" />
          Skip speller
        </button>
        <span style={{ color: `${GOLD_DIM}66` }}>·</span>
        <button onClick={onSubstituteWord} className="transition-opacity hover:opacity-80" style={{ fontSize: 12, color: GOLD_DIM }}>
          Wrong word? Substitute
        </button>
      </div>
    </motion.div>
  );
}
