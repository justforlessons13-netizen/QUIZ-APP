// Replaces src/components/bee-game/BeeLeaderboard.tsx
// Adds: rank-change slide animation + up/down arrows (vs. previousRankMap,
// captured by useBeeGame.startNextRound — see useBeeGame.ts patch), initials
// avatars, and 10-per-page pagination for larger rosters.
// v2: row status now shows total time spent (this game's real ranking basis)
// instead of a "N correct" count. Note the slide/arrow animation is a no-op
// on Round 1 by design — there's no previous rank to compare against yet;
// it activates from Round 2 onward.
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUp, ArrowDown, Trophy } from 'lucide-react';
import { BeePlayer, compareBeePlayers } from '@/types/bee';
import { beeInitials, beeAvatarColor } from '@/lib/beeAvatar';

const PAGE_SIZE = 10;
const ROW_HEIGHT = 56;

interface BeeLeaderboardProps {
  players: BeePlayer[];
  round: number;
  previousRankMap?: Record<string, number> | null;
  onNextRound: () => void;
}

export function BeeLeaderboard({ players, round, previousRankMap, onNextRound }: BeeLeaderboardProps) {
  const ranked = useMemo(() => [...players].sort(compareBeePlayers), [players]);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));

  const rows = ranked.map((player, i) => {
    const rank = i + 1;
    const prevRank = previousRankMap?.[player.id] ?? rank;
    return { player, rank, prevRank, delta: prevRank - rank };
  });

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

      <div
        className="w-full relative"
        style={{ height: Math.min(ranked.length, PAGE_SIZE) * ROW_HEIGHT }}
      >
        {rows.map(({ player, rank, prevRank, delta }) => {
          const displayIndex = rank - 1 - page * PAGE_SIZE;
          const prevDisplayIndex = prevRank - 1 - page * PAGE_SIZE;
          const visible = displayIndex >= 0 && displayIndex < PAGE_SIZE;
          const color = beeAvatarColor(player.name);
          return (
            <motion.div
              key={player.id}
              initial={{ top: prevDisplayIndex * ROW_HEIGHT, opacity: visible ? 1 : 0 }}
              animate={{ top: displayIndex * ROW_HEIGHT, opacity: visible ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              style={{ position: 'absolute', left: 0, right: 0 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                player.status === 'eliminated' ? 'border-border bg-card/50 opacity-60' : 'border-border bg-card'
              }`}
            >
              <span className="text-muted-foreground font-bungee text-xs w-6 text-center">{rank}</span>
              <span className="w-4 flex items-center justify-center">
                {delta > 0 && <ArrowUp className="w-3 h-3 text-success" />}
                {delta < 0 && <ArrowDown className="w-3 h-3 text-destructive" />}
              </span>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center font-bungee text-[10px] shrink-0"
                style={{ background: `${color}22`, border: `1.5px solid ${color}`, color }}
              >
                {beeInitials(player.name)}
              </span>
              <span
                className={`flex-1 font-sugo uppercase tracking-wider text-sm truncate ${
                  player.status === 'eliminated' ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              >
                {player.name}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {player.status === 'eliminated' ? 'Out' : `${(player.totalTimeMs / 1000).toFixed(1)}s`}
              </span>
            </motion.div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-7 h-7 rounded-full border border-primary/30 text-primary disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-7 h-7 rounded-full border border-primary/30 text-primary disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}

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
