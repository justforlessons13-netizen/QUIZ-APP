// Replaces src/components/bee-game/BeeStandings.tsx
// Sequenced final reveal: 4th+ (paginated, 10/page) → 3rd → 2nd → 1st → full
// podium (podium + paginated rest below it). Initials avatars throughout.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, LayoutDashboard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BeePlayer, compareBeePlayers } from '@/types/bee';
import { playFanfare } from '@/lib/sounds';
import { beeInitials, beeAvatarColor } from '@/lib/beeAvatar';

interface BeeStandingsProps {
  players: BeePlayer[];
  onPlayAgain: () => void;
  onDashboard: () => void;
}

type Step = 'rest' | 'third' | 'second' | 'first' | 'podium';
const PAGE_SIZE = 10;

function timeLabel(player?: BeePlayer): string {
  if (!player) return '';
  if (player.status === 'eliminated') return `Eliminated · Round ${player.eliminatedAtRound}`;
  return `${(player.totalTimeMs / 1000).toFixed(1)}s total`;
}

function Avatar({ player, size }: { player: BeePlayer; size: number }) {
  const color = beeAvatarColor(player.name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bungee shrink-0"
      style={{ width: size, height: size, background: `${color}22`, border: `2px solid ${color}`, color, fontSize: size * 0.32 }}
    >
      {beeInitials(player.name)}
    </div>
  );
}

export function BeeStandings({ players, onPlayAgain, onDashboard }: BeeStandingsProps) {
  const soundPlayed = useRef(false);
  const ranked = useMemo(() => [...players].sort(compareBeePlayers), [players]);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const [step, setStep] = useState<Step>('rest');
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageRows = rest.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (step !== 'first' || soundPlayed.current) return;
    soundPlayed.current = true;
    playFanfare(true);
  }, [step]);

  const restList = (compact: boolean) => (
    <div className="w-full space-y-2">
      {pageRows.map((player, i) => (
        <div
          key={player.id}
          className={`flex items-center gap-3 rounded-xl border border-border bg-card ${compact ? 'px-4 py-2.5' : 'px-4 py-3'}`}
        >
          <span className="text-muted-foreground font-bungee text-xs w-6 text-center">{page * PAGE_SIZE + i + 4}</span>
          {!compact && <Avatar player={player} size={28} />}
          <span className={`flex-1 font-sugo uppercase tracking-wider truncate ${compact ? 'text-xs' : 'text-sm'}`}>{player.name}</span>
          <span className={`text-muted-foreground uppercase tracking-wider ${compact ? 'text-[11px]' : 'text-xs'}`}>{timeLabel(player)}</span>
        </div>
      ))}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-1">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 rounded-full border border-primary/30 text-primary disabled:opacity-30">‹</button>
          <span className="text-xs text-muted-foreground uppercase">Page {page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 rounded-full border border-primary/30 text-primary disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  );

  const medalStep = (player: BeePlayer | undefined, nextLabel: string, onNext: () => void, emoji: string, key: string) => (
    <motion.div
      key={key}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-lg mx-auto flex flex-col items-center gap-5 py-14 px-4 text-center"
    >
      <div className="text-6xl">{emoji}</div>
      {player && <Avatar player={player} size={72} />}
      <h1 className="text-3xl font-bungee text-white uppercase tracking-wide">{player?.name ?? '—'}</h1>
      <p className="text-muted-foreground text-sm">{timeLabel(player)}</p>
      <button
        onClick={onNext}
        className="relative bg-transparent border-2 border-primary rounded-xl py-3 px-8 text-primary text-[15px] font-bungee tracking-[3px] uppercase flex items-center gap-3 hover:bg-primary/10 transition-colors"
      >
        {nextLabel} <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {step === 'rest' && (
        <motion.div
          key="rest"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-10 px-4"
        >
          <div className="text-center">
            <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bungee text-white uppercase tracking-wide">Final Standings</h1>
            {rest.length > 0 && <p className="text-muted-foreground text-sm mt-1">Ranks 4 and below — top 3 revealed next</p>}
          </div>
          {rest.length > 0 && restList(false)}
          <button
            onClick={() => setStep('third')}
            className="relative w-full max-w-[280px] bg-primary text-primary-foreground rounded-xl py-3 px-6 text-[15px] font-bungee tracking-[3px] uppercase flex items-center justify-center gap-3 hover:brightness-105 transition"
          >
            Reveal Top 3 <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}
      {step === 'third' && medalStep(top3[2], 'Reveal 2nd Place', () => setStep('second'), '🥉', 'third')}
      {step === 'second' && medalStep(top3[1], 'Reveal Winner', () => setStep('first'), '🥈', 'second')}
      {step === 'first' && medalStep(top3[0], 'View Podium', () => setStep('podium'), '🥇', 'first')}
      {step === 'podium' && (
        <motion.div
          key="podium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-lg mx-auto flex flex-col items-center gap-6 py-10 px-4"
        >
          <h1 className="text-xl font-bungee text-primary uppercase tracking-wide">Bee Champions</h1>
          <div className="flex items-end gap-3">
            {[top3[1], top3[0], top3[2]].map((player, idx) =>
              player ? (
                <div key={player.id} className="flex flex-col items-center gap-2" style={{ width: idx === 1 ? 130 : 110 }}>
                  <Avatar player={player} size={idx === 1 ? 40 : 32} />
                  <span className="text-xs font-bold text-white text-center truncate w-full">{player.name}</span>
                  <div
                    className="w-full rounded-t-xl flex items-end justify-center pb-2 font-bungee text-xs border-primary/40 border"
                    style={{
                      height: idx === 1 ? 100 : idx === 0 ? 72 : 52,
                      background: idx === 1 ? 'hsl(var(--primary) / .18)' : 'hsl(var(--muted) / .3)',
                      color: '#fff',
                    }}
                  >
                    {idx === 1 ? '🥇' : idx === 0 ? '🥈' : '🥉'}
                  </div>
                </div>
              ) : null
            )}
          </div>
          {rest.length > 0 && (
            <>
              <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground -mb-2">Rest of the field</p>
              {restList(true)}
            </>
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
      )}
    </AnimatePresence>
  );
}
