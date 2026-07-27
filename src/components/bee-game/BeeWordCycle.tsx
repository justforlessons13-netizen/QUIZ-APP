import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const GOLD     = 'oklch(80% 0.16 92)';
const GOLD_DIM = 'oklch(70% 0.02 92)';

/** Ripple effect — spawns a temporary element inside the button */
function useRipple() {
  return useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn   = e.currentTarget;
    const r     = document.createElement('span');
    const rect  = btn.getBoundingClientRect();
    const s     = Math.max(rect.width, rect.height);
    r.style.cssText = [
      'position:absolute',
      'border-radius:50%',
      `background:oklch(80% 0.16 92 / 0.3)`,
      `width:${s}px`,
      `height:${s}px`,
      `left:${e.clientX - rect.left - s / 2}px`,
      `top:${e.clientY - rect.top - s / 2}px`,
      'transform:scale(0)',
      'animation:beeRipple 0.5s ease-out forwards',
      'pointer-events:none',
    ].join(';');
    btn.appendChild(r);
    setTimeout(() => r.remove(), 500);
  }, []);
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function BeeWordCycle({
  word, player, hintsUsed, onRequestHint, onCorrect, onIncorrect, onSkip, onSubstituteWord,
}: BeeWordCycleProps) {
  const definitionRevealed = hintsUsed.includes('definition');
  const sentenceRevealed   = hintsUsed.includes('sentence');
  const [manualGrading, setManualGrading] = useState(false);
  const addRipple = useRipple();

  const hintBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Bungee', cursive, sans-serif",
    fontSize: 11,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    padding: '12px 22px',
    borderRadius: 10,
    border: `1.5px solid ${GOLD}66`,
    color: '#fff',
    cursor: 'pointer',
    outline: 'none',
    position: 'relative',
    overflow: 'hidden',
    transition: 'background-color 0.35s, border-color 0.35s, box-shadow 0.35s, filter 0.15s, transform 0.1s',
    background:  active ? `${GOLD}40` : 'rgba(255,255,255,0.05)',
    boxShadow:   active ? `0 0 20px ${GOLD}1a, inset 0 1px 0 ${GOLD}14` : 'none',
  });

  return (
    <>
      {/* Ripple keyframe — injected once */}
      <style>{`@keyframes beeRipple { to { transform: scale(4); opacity: 0; } }`}</style>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[800px] mx-auto flex flex-col items-center gap-6 text-center"
        style={{ padding: '0 20px 60px' }}
      >
        {/* "{Name}'s word" label */}
        <motion.div
          variants={itemVariants}
          style={{
            fontSize: 12,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: GOLD_DIM,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 400,
          }}
        >
          {player.name}'s word
        </motion.div>

        {/* Word card */}
        <motion.div
          variants={itemVariants}
          className="w-full"
          style={{
            maxWidth: 640,
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${GOLD}4d`,
            borderRadius: 24,
            padding: '44px 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
          }}
        >
          <h1
            className="font-bungee break-words"
            style={{
              fontSize: 56,
              color: GOLD,
              textTransform: 'uppercase',
              textShadow: `0 0 30px ${GOLD}4d`,
              lineHeight: 1.1,
              textAlign: 'center',
              wordBreak: 'break-word',
              letterSpacing: '0.04em',
            }}
          >
            {word.word}
          </h1>
        </motion.div>

        {/* Hint buttons */}
        <motion.div variants={itemVariants} className="flex gap-3">
          <button
            onClick={(e) => { addRipple(e); onRequestHint('definition'); }}
            style={hintBtnStyle(definitionRevealed)}
            onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
            onMouseOut={e => (e.currentTarget.style.filter = '')}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
          >
            Definition
          </button>
          <button
            onClick={(e) => { addRipple(e); onRequestHint('sentence'); }}
            disabled={!word.exampleSentence}
            style={{ ...hintBtnStyle(sentenceRevealed), opacity: !word.exampleSentence ? 0.3 : 1, cursor: !word.exampleSentence ? 'not-allowed' : 'pointer' }}
            onMouseOver={e => { if (word.exampleSentence) e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseOut={e => (e.currentTarget.style.filter = '')}
            onMouseDown={e => { if (word.exampleSentence) e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={e => (e.currentTarget.style.transform = '')}
          >
            Use in sentence
          </button>
        </motion.div>

        {/* Hint text area */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-center gap-2 w-full"
          style={{ maxWidth: 460, minHeight: 70 }}
        >
          <AnimatePresence mode="wait">
            {definitionRevealed && (
              <motion.p
                key="def"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontSize: 16, color: 'oklch(85% 0.01 195)', textAlign: 'center', lineHeight: 1.5, fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                {word.definition}
              </motion.p>
            )}
            {sentenceRevealed && word.exampleSentence && (
              <motion.p
                key="sent"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontSize: 16, color: 'oklch(85% 0.01 195)', textAlign: 'center', lineHeight: 1.5, fontStyle: 'italic', fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                "{word.exampleSentence}"
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Waiting row — CSS spinner */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2"
          style={{ fontSize: 12, color: GOLD_DIM, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          <span
            style={{
              width: 14, height: 14, flexShrink: 0,
              border: `2px solid ${GOLD_DIM}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 1s linear infinite',
            }}
          />
          Waiting for {player.name} to answer on the stage device…
        </motion.div>

        {/* Grading area */}
        <motion.div variants={itemVariants}>
          {manualGrading ? (
            <div className="grid grid-cols-2 gap-3" style={{ width: '100%', maxWidth: 420 }}>
              <button
                onClick={onCorrect}
                className="flex items-center justify-center gap-2 transition-[filter]"
                style={{ padding: 16, borderRadius: 12, fontFamily: "'Bungee', cursive, sans-serif", fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: 'oklch(55% 0.18 145 / 0.2)', border: '1px solid oklch(55% 0.18 145 / 0.4)', color: 'oklch(70% 0.15 145)' }}
                onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                onMouseOut={e => (e.currentTarget.style.filter = '')}
              >
                <Check size={20} /> Correct
              </button>
              <button
                onClick={onIncorrect}
                className="flex items-center justify-center gap-2 transition-[filter]"
                style={{ padding: 16, borderRadius: 12, fontFamily: "'Bungee', cursive, sans-serif", fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', background: 'oklch(55% 0.2 25 / 0.2)', border: '1px solid oklch(55% 0.2 25 / 0.4)', color: 'oklch(70% 0.2 25)' }}
                onMouseOver={e => (e.currentTarget.style.filter = 'brightness(1.15)')}
                onMouseOut={e => (e.currentTarget.style.filter = '')}
              >
                <X size={20} /> Incorrect
              </button>
            </div>
          ) : (
            <button
              onClick={() => setManualGrading(true)}
              style={{ fontSize: 12, color: GOLD_DIM, textDecoration: 'underline', textUnderlineOffset: 2, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui, -apple-system, sans-serif', transition: 'opacity 0.2s' }}
              onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >
              Device unavailable? Grade manually
            </button>
          )}
        </motion.div>

        {/* Action row */}
        <motion.div variants={itemVariants} className="flex items-center gap-4">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
            style={{ fontSize: 12, color: GOLD_DIM, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {/* Skip icon matching HTML */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
            Skip speller
          </button>
          <span style={{ color: `${GOLD_DIM}66` }}>·</span>
          <button
            onClick={onSubstituteWord}
            className="transition-opacity hover:opacity-70"
            style={{ fontSize: 12, color: GOLD_DIM, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            Wrong word? Substitute
          </button>
        </motion.div>
      </motion.div>

      {/* CSS spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
