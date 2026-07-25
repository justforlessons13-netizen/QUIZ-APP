import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Play } from 'lucide-react';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

export const GAME_RULES = [
  { emoji: '🤫', title: 'SILENCE IS GOLDEN', description: 'Do not shout the correct answer!' },
  { emoji: '🎯', title: '6 TOTAL ROUNDS', description: 'Rankings will be shown after every 2 rounds.' },
  { emoji: '⚖️', title: 'THE TIEBREAKER', description: 'If teams tie in score, the winner is the team with the highest final round score.' },
  { emoji: '📵', title: 'NO CHEATING', description: 'Using your phone or the internet will result in a ban.' },
  { emoji: '⏱️', title: 'WATCH THE CLOCK', description: 'Answers must be locked in before the timer runs out.' },
  { emoji: '⚡', title: 'GO HARD IN ROUND 6', description: 'The final round allows you to wager points for double or nothing!' }
];

export interface GameRulesDisplayProps {
  projectorMode?: boolean;
  onContinue: () => void;
  currentRuleIndex?: number;
  onSetRuleIndex?: (index: number) => void;
}

/* ── scoped styles for pseudo-class / responsive rules that can't be inline ── */
const scopedCSS = `
.gr-arrow {
  width: 44px; height: 44px; min-width: 44px;
  border-radius: 50%;
  border: 1px solid ${alpha(theme.color1, 0.188)};
  background: ${alpha(theme.color1, 0.125)};
  color: ${theme.color1};
  font-size: 19px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; padding: 0;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, opacity 0.2s;
}
.gr-arrow:not(:disabled):hover {
  background: ${alpha(theme.color1, 0.25)};
  transform: scale(1.1);
}
.gr-arrow:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.gr-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  border: none; padding: 0;
  cursor: pointer;
  transition: all 0.3s ease;
}
.gr-dot:hover { transform: scale(1.3); }
@media (max-width: 640px) {
  .gr-arrow { width: 40px; height: 40px; min-width: 40px; font-size: 18px; }
  .gr-carousel-area { gap: 8px !important; }
}
`;

export function GameRulesDisplay({ projectorMode, onContinue, currentRuleIndex = 0, onSetRuleIndex }: GameRulesDisplayProps) {
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);

  const total = GAME_RULES.length;
  const isFirst = currentRuleIndex === 0;
  const isLast = currentRuleIndex === total - 1;
  const allVisited = visited.size === total;

  // Track visited cards
  useEffect(() => {
    setVisited(prev => {
      if (prev.has(currentRuleIndex)) return prev;
      const next = new Set(prev);
      next.add(currentRuleIndex);
      return next;
    });
  }, [currentRuleIndex]);

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < total && onSetRuleIndex) onSetRuleIndex(index);
  }, [total, onSetRuleIndex]);

  const handleNext = useCallback(() => { if (!isLast) goTo(currentRuleIndex + 1); }, [isLast, currentRuleIndex, goTo]);
  const handlePrev = useCallback(() => { if (!isFirst) goTo(currentRuleIndex - 1); }, [isFirst, currentRuleIndex, goTo]);

  // Keyboard: ArrowLeft / ArrowRight / Enter / Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      else if ((e.key === 'Enter' || e.key === ' ') && allVisited && !projectorMode) { e.preventDefault(); onContinue(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrev, handleNext, allVisited, onContinue, projectorMode]);

  // Touch swipe (threshold 50px)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? handleNext() : handlePrev(); }
    touchStartX.current = null;
  };

  const carouselMaxWidth = projectorMode ? 760 : 640;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full flex-1 flex flex-col items-center relative z-10 px-10"
    >
      <style>{scopedCSS}</style>

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">

      {/* ── Title ── */}
      <div className="text-center" style={{ marginBottom: 32 }}>
        <h1
          className="font-bungee text-white uppercase"
          style={{ fontSize: projectorMode ? 48 : 38 }}
        >
          Game Rules
        </h1>
        <p
          className="font-bungee uppercase"
          style={{
            fontSize: projectorMode ? 14 : 12,
            color: 'oklch(70% 0.01 195)',
            letterSpacing: '0.15em',
            marginTop: projectorMode ? 10 : 8,
          }}
        >
          Know before you play
        </p>
      </div>

      {/* ── Carousel Area: arrows + viewport ── */}
      <div
        className="gr-carousel-area flex items-center w-full"
        style={{ gap: 16, maxWidth: carouselMaxWidth }}
      >

        {/* Left Arrow */}
        {!projectorMode && (
          <button className="gr-arrow" onClick={handlePrev} disabled={isFirst} aria-label="Previous rule">‹</button>
        )}

        {/* Card Viewport */}
        <div
          style={{ flex: 1, overflow: 'hidden', borderRadius: projectorMode ? 20 : 16, minWidth: 0 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            style={{
              display: 'flex',
              transform: `translateX(-${currentRuleIndex * 100}%)`,
              transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {GAME_RULES.map((rule, idx) => (
              <div key={idx} style={{ flex: '0 0 100%', minWidth: 0, width: '100%' }}>
                <div
                  style={{
                    background: '#13131f',
                    border: `1px solid ${alpha(theme.color1, 0.145)}`,
                    borderRadius: projectorMode ? 20 : 16,
                    padding: projectorMode ? '56px 40px' : '40px 32px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top accent line */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: projectorMode ? 4 : 3,
                    background: `linear-gradient(90deg, transparent, ${theme.color1}, transparent)`,
                    opacity: 0.5,
                  }} />

                  {/* Vertical centered content */}
                  <div className="flex flex-col items-center text-center" style={{ gap: projectorMode ? 26 : 20 }}>
                    {/* Rule label */}
                    <div style={{
                      fontSize: projectorMode ? 16 : 13, textTransform: 'uppercase', letterSpacing: 2,
                      color: 'oklch(60% 0.01 195)', fontWeight: 600,
                    }}>
                      Rule {idx + 1} of {total} — {rule.title}
                    </div>

                    {/* Icon */}
                    <div style={{
                      fontSize: projectorMode ? 68 : 48, lineHeight: 1,
                      filter: `drop-shadow(0 0 ${projectorMode ? 16 : 12}px ${alpha(theme.color1, 0.4)})`,
                    }}>
                      {rule.emoji}
                    </div>

                    {/* Rule text */}
                    <div style={{
                      fontSize: projectorMode ? 32 : 24,
                      fontWeight: 600, color: 'oklch(88% 0.005 195)', lineHeight: 1.4,
                    }}>
                      {rule.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        {!projectorMode && (
          <button className="gr-arrow" onClick={handleNext} disabled={isLast} aria-label="Next rule">›</button>
        )}
      </div>

      {/* ── Progress Dots ── */}
      <div className="flex justify-center" style={{ gap: 10, marginTop: projectorMode ? 32 : 24 }}>
        {GAME_RULES.map((_, idx) => {
          const isActive = idx === currentRuleIndex;
          const isVisited = visited.has(idx);
          return (
            <button
              key={idx}
              className="gr-dot"
              onClick={() => goTo(idx)}
              aria-label={`Go to rule ${idx + 1}`}
              style={{
                background: isActive ? theme.color1 : isVisited ? 'oklch(60% 0.01 195)' : alpha(theme.color1, 0.15),
                transform: isActive ? 'scale(1.2)' : 'scale(1)',
                boxShadow: isActive ? `0 0 10px ${alpha(theme.color1, 0.35)}` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* ── Viewed Hint ── */}
      {!projectorMode && !allVisited && (
        <div style={{ fontSize: 13, color: 'oklch(60% 0.01 195)', opacity: 0.7, textAlign: 'center', marginTop: 16 }}>
          Browse all rules to unlock the start button
        </div>
      )}

      </div>

      {/* ── CTA Button row (separate, bottom-padded — matches Lobby's Start Game row) ── */}
      {!projectorMode && (
        <div className="w-full flex justify-center items-center" style={{ padding: '14px 0 20px' }}>
          <AnimatePresence>
            {allVisited && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onContinue}
                className="flex items-center justify-center gap-3 bg-transparent border-2 font-bungee uppercase"
                style={{
                  minWidth: 260,
                  padding: '15px 46px',
                  borderRadius: 10,
                  fontSize: 14,
                  letterSpacing: '0.15em',
                  borderColor: theme.color1,
                  color: theme.color1,
                  boxShadow: `0 0 20px ${alpha(theme.color1, 0.188)}`,
                }}
              >
                <Play className="w-4 h-4 fill-current" /> Let's Go!
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
