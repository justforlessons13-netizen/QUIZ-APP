import { motion } from 'framer-motion';
import { ArrowRight, Trophy } from 'lucide-react';
import { BeePlayer, compareBeePlayers } from '@/types/bee';

interface BeeLeaderboardProps {
  players: BeePlayer[];
  round: number;
  onNextRound: () => void;
}

export function BeeLeaderboard({ players, round, onNextRound }: BeeLeaderboardProps) {
  const ranked = [...players].sort(compareBeePlayers);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-10 px-4"
    >
      <div className="text-center">
        <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
        <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Round {round} Standings</h1>
      </div>

      <div className="w-full space-y-2">
        {ranked.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
              player.status === 'eliminated'
                ? 'border-border bg-card/50 opacity-60'
                : 'border-border bg-card'
            }`}
          >
            <span className="text-muted-foreground font-bungee text-xs w-6 text-center">{i + 1}</span>
            <span className={`flex-1 font-sugo uppercase tracking-wider text-sm truncate ${player.status === 'eliminated' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {player.name}
            </span>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              {player.status === 'eliminated' ? 'Out' : `${player.wordsCorrect} correct`}
            </span>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onNextRound}
        className="relative w-full max-w-[280px] bg-transparent border-2 border-primary rounded-xl py-3 px-6 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 hover:bg-primary/10 transition-colors shadow-2xl"
      >
        Next Round
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}
