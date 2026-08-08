import { motion } from 'framer-motion';
import { TerritoryQuestion, TerritoryPlayer, TerritoryPhase } from '@/types/territory';
import { TerritoryMapDef } from '@/types/territory';
import { TerritoryMapView } from './TerritoryMapView';
import { TerritoryTurnBanner } from './TerritoryTurnBanner';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface BattleQuestionProps {
  phase: TerritoryPhase; // 'capture' | 'battle'
  question: TerritoryQuestion | null;
  round: number;
  totalRounds: number;
  timeLeft: number;
  maxTime: number;
  players: TerritoryPlayer[];
  map: TerritoryMapDef;
  answeredCount: number;
  totalActive: number;
}

export function BattleQuestion({
  phase, question, round, totalRounds, timeLeft, maxTime, players, map, answeredCount, totalActive,
}: BattleQuestionProps) {
  const isLowTime = timeLeft <= 5 && timeLeft > 0;
  const label = phase === 'capture' ? 'Capture Phase' : `Battle Round ${round} of ${totalRounds}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative w-full flex-1 flex flex-col items-center px-4 py-4 gap-3"
    >
      <TerritoryTurnBanner label={label} bannerKey={`${phase}-${round}-${question?.id}`} />

      <div className="relative flex items-center justify-center">
        <TerritoryMapView map={map} players={players} size={300} />

        {/* Parchment question card, overlaying the map like the reference's in-battle modal */}
        <div
          className="absolute inset-x-[-8%] top-1/2 -translate-y-1/2 rounded-2xl px-5 py-4 flex flex-col items-center gap-3"
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

      <TerritoryScoreBar players={players} />

      <div
        className="font-bungee text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-full"
        style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
      >
        {label}
      </div>
    </motion.div>
  );
}
