import { motion } from 'framer-motion';
import { TerritoryQuestion, TerritoryPlayer, TerritoryRoundKind } from '@/types/territory';
import { TerritoryTurnBanner } from './TerritoryTurnBanner';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

const ROUND_LABEL: Record<TerritoryRoundKind, string> = {
  'base-capture': 'Base Capture',
  'land-capture': 'Land Capture',
  battle: 'Battle',
};

interface BattleQuestionProps {
  roundKind: TerritoryRoundKind;
  question: TerritoryQuestion | null;
  timeLeft: number;
  maxTime: number;
  players: TerritoryPlayer[];
  answeredCount: number;
  totalActive: number;
  attacker?: TerritoryPlayer | null; // battle only
  defender?: TerritoryPlayer | null; // battle only
}

// Overlay content only — the map itself is rendered once as a shared full-bleed backdrop by
// TerritoryGameController (src/pages/TerritoryGame.tsx), not here.
export function BattleQuestion({
  roundKind, question, timeLeft, players, answeredCount, totalActive, attacker, defender,
}: BattleQuestionProps) {
  const isLowTime = timeLeft <= 5 && timeLeft > 0;
  const label = roundKind === 'battle' && attacker && defender
    ? `${attacker.name} vs ${defender.name}`
    : ROUND_LABEL[roundKind];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 flex flex-col items-center justify-between px-4 py-4 md:py-8"
    >
      <TerritoryTurnBanner label={ROUND_LABEL[roundKind]} bannerKey={`${roundKind}-${attacker?.id}-${question?.id}`} />

      {/* Parchment question card, floating over the shared map backdrop */}
      <div className="flex-1 w-full flex items-center justify-center">
        <div
          className="w-full max-w-lg rounded-2xl px-5 py-4 flex flex-col items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, #e9d8ab 0%, #d4bd82 100%)',
            border: '3px solid #7a5a2e',
            boxShadow: '0 10px 30px rgba(0,0,0,.55), inset 0 0 20px rgba(122,90,46,.25)',
          }}
        >
          <div className="flex items-center gap-3 w-full justify-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bungee text-base flex-shrink-0"
              style={{ border: `2px solid ${isLowTime ? '#c0392b' : '#7a5a2e'}`, color: isLowTime ? '#c0392b' : '#4a3418', background: 'rgba(255,255,255,.25)' }}
            >
              {timeLeft}
            </div>
            <p className="font-bungee text-[#3a2712] text-center text-sm md:text-base leading-snug">
              {question?.text ?? 'Loading question...'}
            </p>
          </div>

          {question?.type === 'choice' && question.options && (
            <div className="grid grid-cols-2 gap-2 w-full">
              {question.options.map((opt, i) => (
                <div
                  key={i}
                  className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-[#3a2712]"
                  style={{ background: 'rgba(255,255,255,.35)', border: '1px solid rgba(122,90,46,.4)' }}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] uppercase tracking-widest font-bungee" style={{ color: '#5c4322' }}>
            {answeredCount} / {totalActive} answered
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <TerritoryScoreBar players={players} />
        <div
          className="font-bungee text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
        >
          {label}
        </div>
      </div>
    </motion.div>
  );
}
