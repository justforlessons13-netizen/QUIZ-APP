import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { TerritoryAnswerBreakdown, TerritoryPlayer } from '@/types/territory';
import { PLAYER_COLORS } from './TerritoryMapView';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { Emoji3D } from '@/components/ui/Emoji3D';

interface TerritoryAnswerRevealProps {
  breakdown: TerritoryAnswerBreakdown;
  players: TerritoryPlayer[];
}

// Brief auto-advancing beat between 'question' and whatever's next (pick/reveal/final-standings) —
// shows everyone's answer, correctness, and time so the pick order (correct-then-fastest) that's
// about to play out isn't a mystery. Overlay content only — the map itself is rendered once as a
// shared full-bleed backdrop by TerritoryGameController (src/pages/TerritoryGame.tsx).
export function TerritoryAnswerReveal({ breakdown, players }: TerritoryAnswerRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 flex flex-col items-center justify-between px-4 py-4 md:py-8"
    >
      <div />

      <div className="flex-1 w-full flex items-center justify-center">
        <div
          className="w-full max-w-lg rounded-2xl px-5 py-4 flex flex-col items-center gap-3"
          style={{
            background: 'linear-gradient(180deg, #e9d8ab 0%, #d4bd82 100%)',
            border: '3px solid #7a5a2e',
            boxShadow: '0 10px 30px rgba(0,0,0,.55), inset 0 0 20px rgba(122,90,46,.25)',
          }}
        >
          <p className="text-[10px] uppercase tracking-widest font-bungee" style={{ color: '#5c4322' }}>Correct answer</p>
          <p className="font-bungee text-[#3a2712] text-center text-base">{breakdown.correctAnswer}</p>

          <div className="w-full space-y-1.5">
            {breakdown.entries.map((entry) => {
              const playerIdx = players.findIndex((p) => p.id === entry.playerId);
              const player = players[playerIdx];
              if (!player) return null;
              const color = PLAYER_COLORS[playerIdx % PLAYER_COLORS.length];
              return (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                  style={{ background: 'rgba(255,255,255,.35)', border: '1px solid rgba(122,90,46,.4)' }}
                >
                  <Emoji3D emoji={player.emoji} className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-bungee uppercase truncate flex-shrink-0 max-w-[80px]" style={{ color }}>{player.name}</span>
                  <span className="text-xs text-[#3a2712] truncate flex-1">{entry.answer || '—'}</span>
                  {entry.isCorrect
                    ? <Check className="w-4 h-4 flex-shrink-0" style={{ color: '#2d7a4a' }} />
                    : <X className="w-4 h-4 flex-shrink-0" style={{ color: '#c0392b' }} />}
                  <span className="text-[10px] font-bungee tabular-nums flex-shrink-0" style={{ color: '#5c4322' }}>
                    {entry.elapsedMs != null ? `${(entry.elapsedMs / 1000).toFixed(2)}s` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TerritoryScoreBar players={players} />
    </motion.div>
  );
}
