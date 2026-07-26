// Replaces src/components/bee-game/BeeTieBreak.tsx — adds initials avatars.
import { motion } from 'framer-motion';
import { Timer, Zap } from 'lucide-react';
import { BeePlayer } from '@/types/bee';
import { beeInitials, beeAvatarColor } from '@/lib/beeAvatar';

interface BeeTieBreakProps {
  players: BeePlayer[];
  onEliminateSlowest: () => void;
}

function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  return seconds < 10 ? `${seconds.toFixed(1)}s` : `${Math.round(seconds)}s`;
}

export function BeeTieBreak({ players, onEliminateSlowest }: BeeTieBreakProps) {
  const active = [...players].filter((p) => p.status === 'active').sort((a, b) => a.totalTimeMs - b.totalTimeMs);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-10 px-4"
    >
      <div className="text-center">
        <Timer className="w-8 h-8 text-primary mx-auto mb-2" />
        <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Sudden Death Tiebreak</h1>
        <p className="text-muted-foreground text-sm mt-1">
          No fresh words left for everyone still standing — ranked by total time, fastest first.
        </p>
      </div>

      <div className="w-full space-y-2">
        {active.map((player, i) => {
          const color = beeAvatarColor(player.name);
          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                i === active.length - 1 ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card'
              }`}
            >
              <span className="text-muted-foreground font-bungee text-xs w-6 text-center">{i + 1}</span>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center font-bungee text-[10px] shrink-0"
                style={{ background: `${color}22`, border: `1.5px solid ${color}`, color }}
              >
                {beeInitials(player.name)}
              </span>
              <span className="flex-1 font-sugo uppercase tracking-wider text-sm text-foreground truncate">{player.name}</span>
              <span className={`text-xs uppercase tracking-wider ${i === active.length - 1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {formatElapsed(player.totalTimeMs)} total
              </span>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={onEliminateSlowest}
        className="relative w-full max-w-[320px] bg-transparent border-2 border-destructive rounded-xl py-3 px-6 text-destructive text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 hover:bg-destructive/10 transition-colors shadow-2xl"
      >
        <Zap className="w-5 h-5" />
        Eliminate Slowest
      </button>
    </motion.div>
  );
}
