import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RotateCcw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BeePlayer, compareBeePlayers } from '@/types/bee';
import { playFanfare } from '@/lib/sounds';

interface BeeStandingsProps {
  players: BeePlayer[];
  onPlayAgain: () => void;
  onDashboard: () => void;
}

const medals = ['🥇', '🥈', '🥉'];

export function BeeStandings({ players, onPlayAgain, onDashboard }: BeeStandingsProps) {
  const soundPlayed = useRef(false);
  const ranked = [...players].sort(compareBeePlayers);
  const champion = ranked[0];
  const rest = ranked.slice(1);

  useEffect(() => {
    if (soundPlayed.current) return;
    soundPlayed.current = true;
    playFanfare(true);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-10 px-4"
    >
      <div className="text-center">
        <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
        <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Final Standings</h1>
      </div>

      {champion && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-full p-5 rounded-2xl border-2 border-primary bg-primary/10 text-center shadow-[0_0_30px_rgba(173,187,255,0.25)]"
        >
          <div className="text-4xl mb-1">🏆</div>
          <p className="text-xs uppercase tracking-[3px] text-primary/80 font-sugo mb-1">Champion Speller</p>
          <h2 className="text-2xl font-bungee text-primary uppercase tracking-wide">{champion.name}</h2>
          <p className="text-xs text-muted-foreground mt-1">{champion.wordsCorrect} word{champion.wordsCorrect === 1 ? '' : 's'} spelled correctly</p>
        </motion.div>
      )}

      {rest.length > 0 && (
        <div className="w-full space-y-2">
          {rest.map((player, i) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
            >
              <span className="text-lg w-7 text-center leading-none">
                {medals[i + 1] ?? <span className="text-muted-foreground font-bungee text-xs">{i + 2}</span>}
              </span>
              <span className="flex-1 font-sugo uppercase tracking-wider text-sm text-foreground truncate">
                {player.name}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {player.status === 'eliminated' ? `Round ${player.eliminatedAtRound}` : 'Survived'}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-3 w-full">
        <Button variant="secondary" onClick={onPlayAgain} className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" /> Play Again
        </Button>
        <Button variant="outline" onClick={onDashboard} className="flex-1">
          <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
        </Button>
      </div>
    </motion.div>
  );
}
