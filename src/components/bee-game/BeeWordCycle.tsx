import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
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

export function BeeWordCycle({
  word, player, hintsUsed, onRequestHint, onCorrect, onIncorrect,
}: BeeWordCycleProps) {
  const definitionRevealed = hintsUsed.includes('definition');
  const sentenceRevealed = hintsUsed.includes('sentence');
  const [spelling, setSpelling] = useState('');

  const handleSubmit = () => {
    if (!spelling.trim()) return;
    const correct = spelling.trim().toLowerCase() === word.word.toLowerCase();
    correct ? onCorrect() : onIncorrect();
    setSpelling('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-[600px] mx-auto flex flex-col items-center gap-6 text-center"
      style={{ paddingTop: 40, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 }}
    >
      {/* "{Name}'s word" label */}
      <div
        className="uppercase tracking-[.15em]"
        style={{ fontSize: 12, color: 'oklch(70% 0.02 92)' }}
      >
        {player.name}'s word
      </div>

      {/* Word card — glassmorphism, word only */}
      <div
        className="w-full flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,.06)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${GOLD}4d`,
          borderRadius: 24,
          padding: '44px 30px',
          boxShadow: '0 20px 60px rgba(0,0,0,.35)',
        }}
      >
        <h1
          className="font-bungee break-words"
          style={{
            fontSize: 56,
            color: GOLD,
            textTransform: 'lowercase',
            textShadow: `0 0 30px ${GOLD}4d`,
            lineHeight: 1.1,
          }}
        >
          {word.word}
        </h1>
      </div>

      {/* Hint buttons — outside the card */}
      <div className="flex gap-3">
        <button
          onClick={() => onRequestHint('definition')}
          className="font-bungee uppercase transition-[filter] hover:brightness-110 active:scale-95"
          style={{
            padding: '12px 22px',
            borderRadius: 10,
            background: definitionRevealed ? `${GOLD}22` : 'transparent',
            border: `1.5px solid ${GOLD}66`,
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
            background: sentenceRevealed ? `${GOLD}22` : 'transparent',
            border: `1.5px solid ${GOLD}66`,
            color: '#fff',
            fontSize: 11,
          }}
        >
          Use in sentence
        </button>
      </div>

      {/* Revealed definition / sentence text */}
      <div
        className="flex flex-col items-center justify-center gap-2 w-full"
        style={{ minHeight: 70 }}
      >
        {definitionRevealed && (
          <motion.p
            key="def"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 16, color: 'oklch(85% 0.01 195)', maxWidth: 460 }}
          >
            {word.definition}
          </motion.p>
        )}
        {sentenceRevealed && word.exampleSentence && (
          <motion.p
            key="sent"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 16, color: 'oklch(85% 0.01 195)', maxWidth: 460, fontStyle: 'italic' }}
          >
            "{word.exampleSentence}"
          </motion.p>
        )}
      </div>

      {/* Spelling input + Submit */}
      <div className="flex gap-2.5 w-full" style={{ maxWidth: 420 }}>
        <input
          type="text"
          value={spelling}
          onChange={e => setSpelling(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Type the spelling..."
          className="flex-1 focus:outline-none text-center"
          style={{
            background: 'rgba(0,0,0,.4)',
            border: `1px solid ${GOLD}4d`,
            borderRadius: 12,
            padding: 16,
            color: '#fff',
            fontSize: 16,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!spelling.trim()}
          className="font-bungee uppercase transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            padding: '16px 20px',
            borderRadius: 12,
            background: GOLD,
            color: 'oklch(30% 0.03 60)',
            fontSize: 13,
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Submit
        </button>
      </div>
    </motion.div>
  );
}
