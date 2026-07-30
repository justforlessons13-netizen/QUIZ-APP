import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface RoundRulesDisplayProps {
  round: number;
  totalRounds: number;
  roundName?: string;
  rules?: string;
  projectorMode?: boolean;
  onStartRound: () => void;
  ruleIndex: number;
  onSetRuleIndex: (index: number) => void;
}

const scopedCSS = `
.rr-arrow {
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
.rr-arrow:not(:disabled):hover {
  background: ${alpha(theme.color1, 0.25)};
  transform: scale(1.1);
}
.rr-arrow:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}
.rr-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  border: none; padding: 0;
  cursor: pointer;
  transition: all 0.3s ease;
}
.rr-dot:hover { transform: scale(1.3); }
@media (max-width: 640px) {
  .rr-arrow { width: 38px; height: 38px; min-width: 38px; font-size: 17px; }
}
`;

export function RoundRulesDisplay({ round, totalRounds, roundName, rules, projectorMode, onStartRound, ruleIndex, onSetRuleIndex }: RoundRulesDisplayProps) {
  const displayRules = rules && rules.trim().length > 0
    ? rules.split('\n').map(r => r.trim()).filter(r => r !== '')
    : ["NO PHONES ALLOWED", "DO NOT SHOUT", "WRITE CLEARLY"];

  const touchStartX = useRef<number | null>(null);
  const total = displayRules.length;
  const index = Math.min(ruleIndex, total - 1);
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const goTo = useCallback((i: number) => {
    if (i >= 0 && i < total) onSetRuleIndex(i);
  }, [total, onSetRuleIndex]);

  const handleNext = useCallback(() => { if (!isLast) goTo(index + 1); }, [isLast, index, goTo]);
  const handlePrev = useCallback(() => { if (!isFirst) goTo(index - 1); }, [isFirst, index, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); handlePrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrev, handleNext]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? handleNext() : handlePrev(); }
    touchStartX.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full flex-1 flex flex-col items-center relative z-10 px-10"
    >
      <style>{scopedCSS}</style>

      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">

      {/* ── Header ── */}
      <div
        className="inline-block font-bungee uppercase"
        style={{
          fontSize: 13, letterSpacing: '0.15em', padding: '6px 18px', borderRadius: 20, marginBottom: 20,
          background: alpha(theme.color1, 0.133), border: `1px solid ${alpha(theme.color1, 0.271)}`, color: theme.color1,
        }}
      >
        Round {round} of {totalRounds}
      </div>
      <h1
        className="font-bungee text-white uppercase text-center"
        style={{ fontSize: 38, marginBottom: 40 }}
      >
        {roundName && roundName.trim() ? roundName : `Round ${round}`}
      </h1>

      {/* ── Round info carousel — label + value, no card ── */}
      <div className="flex items-center w-full" style={{ gap: 24, maxWidth: 480 }}>
        {!projectorMode && (
          <button className="rr-arrow" onClick={handlePrev} disabled={isFirst} aria-label="Previous rule">‹</button>
        )}

        <div
          style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            style={{
              display: 'flex',
              transform: `translateX(-${index * 100}%)`,
              transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {displayRules.map((rule, i) => (
              <div key={i} style={{ flex: '0 0 100%', minWidth: 0, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'oklch(60% 0.01 195)', marginBottom: 20 }}>
                  Rule {i + 1} of {total}
                </div>
                <div style={{ fontSize: 26, fontWeight: 600, color: 'oklch(92% 0.005 195)' }}>
                  {rule}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!projectorMode && (
          <button className="rr-arrow" onClick={handleNext} disabled={isLast} aria-label="Next rule">›</button>
        )}
      </div>

      {/* ── Dots ── */}
      {total > 1 && (
        <div className="flex justify-center" style={{ gap: 10, marginTop: 28 }}>
          {displayRules.map((_, i) => (
            <button
              key={i}
              className="rr-dot"
              onClick={() => goTo(i)}
              aria-label={`Go to rule ${i + 1}`}
              style={{
                background: i === index ? theme.color1 : alpha(theme.color1, 0.2),
                transform: i === index ? 'scale(1.2)' : 'scale(1)',
                boxShadow: i === index ? `0 0 10px ${alpha(theme.color1, 0.35)}` : 'none',
              }}
            />
          ))}
        </div>
      )}

      </div>

      {/* ── Start Round button row (separate, bottom-padded) ── */}
      {!projectorMode && (
        <div className="w-full flex justify-center items-center" style={{ padding: '14px 0 20px' }}>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => onStartRound()}
            className="font-bungee text-[14px] uppercase tracking-widest px-11 py-4 rounded-[10px]"
            style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
          >
            ▶ Start Round
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
