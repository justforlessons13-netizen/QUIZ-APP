import { motion } from 'framer-motion';
import { TerritoryPlayer } from '@/types/territory';
import { TerritoryScoreBar } from './TerritoryScoreBar';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

interface RoundRevealProps {
  players: TerritoryPlayer[];
  lastIncome?: Record<string, number>;
  onContinue: () => void;
}

// Base-capture/land-capture never take territory from an opponent (that's Battle's job
// exclusively), so every capture on this screen is neutral land or an unclaimed base. The shared
// map backdrop (rendered once by TerritoryGameController, already fed lastCaptures) shows an
// arrow + ✗ burst on every captured tile — that's the whole story, so this overlay is just the
// score pills and a Continue button, no separate text list.
export function RoundReveal({ players, lastIncome = {}, onContinue }: RoundRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="absolute inset-0 flex flex-col items-center justify-end gap-5 px-4 py-4 md:py-8"
    >
      <TerritoryScoreBar players={players} lastIncome={lastIncome} />

      <button
        onClick={onContinue}
        className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
        style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
      >
        Continue ▶
      </button>
    </motion.div>
  );
}
