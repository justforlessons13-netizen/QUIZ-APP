import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

interface RoundRulesDisplayProps {
  round: number;
  totalRounds: number;
  roundName?: string;
  rules?: string;
  projectorMode?: boolean;
  onStartRound: () => void;
}

const scopedCSS = `
.rr-arrow {
  width: 44px; height: 44px; min-width: 44px;
  border-radius: 50%;
  border: 1px solid ${alpha(theme.color1, 0.3)};
  background: ${alpha(theme.color1, 0.15)};
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
.rr-card-inner {
  background: #13131f;
  border: 1px solid ${alpha(theme.color1, 0.25)};
  border-radius: 16px;
  padding: 48px 36px;
  position: relative;
  overflow: hidden;
}
@media (max-width: 640px) {
  .rr-arrow { width: 38px; height: 38px; min-width: 38px; font-size: 17px; }
  .rr-card-inner { padding: 32px 22px; }
}
`;

export function RoundRulesDisplay({ round, totalRounds, roundName, rules, projectorMode, onStartRound }: RoundRulesDisplayProps) {
  const displayRules = rules && rules.trim().length > 0
    ? rules.split('\n').map(r => r.trim()).filter(r => r !== '')
    : ["NO PHONES ALLOWED", "DO NOT SHOUT", "WRITE CLEARLY"];

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = displayRules.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Reset to the first card whenever a new round's rules load in
  useEffect(() => { setIndex(0); }, [rules, round]);

  const goTo = useCallback((i: number) => {
    if (i >= 0 && i < total) setIndex(i);
  }, [total]);

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
      className="flex flex-col items-center justify-center w-full relative z-10 px-4"
      style={{ maxWidth: 720, margin: '0 auto' }}
    >
      <style>{scopedCSS}</style>

      {/* ── Header ── */}
      <div
        className="inline-block font-bungee text-[13px] uppercase tracking-widest px-5 py-1.5 rounded-full mb-3"
        style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.35)}`, color: theme.color1 }}
      >
        Round {round} of {totalRounds}
      </div>
      <h1
        className="text-3xl md:text-4xl font-bungee text-white tracking-wide uppercase text-center mb-8"
        style={{ textShadow: `0 0 30px ${alpha(theme.color1, 0.5)}` }}
      >
        {roundName && roundName.trim() ? roundName : `Round ${round}`}
      </h1>

      {/* ── Carousel ── */}
      <div className="flex items-center w-full" style={{ gap: 16 }}>
        {!projectorMode && (
          <button className="rr-arrow" onClick={handlePrev} disabled={isFirst} aria-label="Previous rule">‹</button>
        )}

        <div
          style={{ flex: 1, overflow: 'hidden', borderRadius: 16, minWidth: 0 }}
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
              <div key={i} style={{ flex: '0 0 100%', minWidth: 0, width: '100%' }}>
                <div className="rr-card-inner">
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, transparent, ${theme.color1}, transparent)`,
                    opacity: 0.5,
                  }} />
                  <div className="flex flex-col items-center text-center" style={{ gap: 18 }}>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#8a8aa3', fontWeight: 600 }}>
                      Rule {i + 1} of {total}
                    </div>
                    <div
                      className="uppercase tracking-widest"
                      style={{ fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 600, color: '#d9d9d9', lineHeight: 1.4 }}
                    >
                      {rule}
                    </div>
                  </div>
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
        <div className="flex justify-center" style={{ gap: 10, marginTop: 24 }}>
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

      {!projectorMode && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => onStartRound()}
          className="font-bungee text-[14px] uppercase tracking-widest px-11 py-4 rounded-[10px] mt-8"
          style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
        >
          ▶ Start Round
        </motion.button>
      )}
    </motion.div>
  );
}
