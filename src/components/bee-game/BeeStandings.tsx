// Replaces src/components/bee-game/BeeStandings.tsx
// Sequenced final reveal: 4th+ (paginated, 10/page) → 3rd → 2nd → 1st → full
// podium (podium + paginated rest below it). Initials avatars throughout.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, RotateCcw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
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

function Avatar({ player, size, zIndex }: { player: BeePlayer; size: number; zIndex?: number }) {
  const color = beeAvatarColor(player.name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bungee shrink-0"
      style={{ width: size, height: size, background: `${color}22`, border: `2px solid ${color}`, color, fontSize: size * 0.32, position: 'relative', zIndex }}
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
    <div className="w-full flex flex-col gap-2">
      {pageRows.map((player, i) => {
        const isElim = player.status === 'eliminated';
        return (
          <div
            key={player.id}
            className="flex items-center gap-2.5 rounded-[10px] border"
            style={{
              padding: '10px 14px',
              background: 'oklch(14% 0.02 70 / 0.6)',
              borderColor: 'oklch(80% 0.16 92 / 0.12)',
            }}
          >
            <span
              className="font-bungee shrink-0"
              style={{ fontSize: 12, color: 'oklch(70% 0.02 92)', width: 20 }}
            >
              {page * PAGE_SIZE + i + 4}
            </span>
            <span className="flex-1 font-semibold text-[13px] text-white truncate">
              {player.name}
            </span>
            <span
              className="text-[11px] uppercase tracking-wide shrink-0"
              style={{ color: isElim ? 'oklch(65% 0.2 25)' : 'oklch(80% 0.16 92)' }}
            >
              {isElim ? 'Eliminated' : `${(player.totalTimeMs / 1000).toFixed(1)}s`}
            </span>
          </div>
        );
      })}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3.5 pt-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-7 h-7 rounded-full border flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ borderColor: 'oklch(80% 0.16 92 / .3)', color: 'oklch(80% 0.16 92)', background: 'transparent' }}
          >‹</button>
          <span className="text-[11px] uppercase tracking-widest" style={{ color: 'oklch(70% 0.02 92)' }}>
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="w-7 h-7 rounded-full border flex items-center justify-center disabled:opacity-30 transition-opacity"
            style={{ borderColor: 'oklch(80% 0.16 92 / .3)', color: 'oklch(80% 0.16 92)', background: 'transparent' }}
          >›</button>
        </div>
      )}
    </div>
  );


  const PLACE_LABELS: Record<string, string> = { third: '3rd place', second: '2nd place', first: 'Champion' };
  const PLACE_PILL_STYLE: Record<string, React.CSSProperties> = {
    third:  { background: 'oklch(60% 0.08 55 / .18)', border: '1px solid oklch(60% 0.08 55 / .5)',  color: 'oklch(72% 0.1 55)' },
    second: { background: 'oklch(85% 0.01 250 / .18)', border: '1px solid oklch(85% 0.01 250 / .5)', color: 'oklch(88% 0.01 250)' },
    first:  { background: 'oklch(80% 0.16 92 / .2)',   border: '1px solid oklch(80% 0.16 92 / .6)',  color: 'oklch(80% 0.16 92)' },
  };
  const LOTTIE_SRC: Record<string, string> = {
    third:  '/lottie/medal-3rd-bronze.json',
    second: '/lottie/medal-2nd-silver.json',
    first:  '/lottie/crown.json',
  };
  const LOTTIE_SIZE: Record<string, number> = { third: 170, second: 190, first: 200 };
  const NEXT_LABEL: Record<string, string> = { third: 'Reveal 2nd place ▶', second: 'Reveal winner ▶', first: 'View podium ▶' };
  const CONFETTI_SRC = 'https://lottie.host/79266ebc-8b4a-4b7c-a1a0-326ac1057a23/JU5NbpIPAL.lottie';

  const medalStep = (player: BeePlayer | undefined, onNext: () => void, key: 'third' | 'second' | 'first') => {
    const lottieSize = LOTTIE_SIZE[key];
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 py-14 px-4 text-center relative"
      >
        {/* Confetti — winner step only */}
        {key === 'first' && (
          <DotLottieReact
            src={CONFETTI_SRC}
            autoplay
            loop
            style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 520, height: 520,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 0,
            }}
          />
        )}

        {/* Place badge pill */}
        <div
          className="font-bungee text-[12px] uppercase tracking-[.1em] px-4 py-1.5 rounded-full relative z-10"
          style={PLACE_PILL_STYLE[key]}
        >
          {PLACE_LABELS[key]}
        </div>

        {/* Medal / Crown Lottie */}
        <div style={{ width: lottieSize, height: lottieSize, position: 'relative', zIndex: 2 }}>
          <DotLottieReact
            src={LOTTIE_SRC[key]}
            autoplay
            loop
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Avatar */}
        {player && <Avatar player={player} size={key === 'first' ? 64 : 56} zIndex={2} />}

        {/* Name */}
        <h1
          className="font-bungee text-white uppercase relative z-10"
          style={{ fontSize: key === 'first' ? 32 : 26 }}
        >
          {player?.name ?? '—'}
        </h1>

        {/* Time / sub-label */}
        <p className="relative z-10" style={{ fontSize: key === 'first' ? 15 : 14, color: 'oklch(80% 0.16 92)' }}>
          {timeLabel(player)}
        </p>

        {/* Next button */}
        <button
          onClick={onNext}
          className="font-bungee uppercase rounded-[12px] transition-[filter] hover:brightness-110 active:scale-95 relative z-10"
          style={{ padding: '14px 30px', background: 'oklch(80% 0.16 92)', color: 'oklch(30% 0.03 60)', fontSize: 13 }}
        >
          {NEXT_LABEL[key]}
        </button>
      </motion.div>
    );
  };


  return (
    <AnimatePresence mode="wait">
      {step === 'rest' && (
        <motion.div
          key="rest"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-lg mx-auto flex flex-col items-center gap-4 py-10 px-4"
        >
          <div className="text-center">
            <h1
              className="font-bungee uppercase tracking-[.08em]"
              style={{ fontSize: 14, color: 'oklch(80% 0.16 92)' }}
            >
              Final Standings
            </h1>
            {rest.length > 0 && (
              <p
                className="mt-1 uppercase tracking-[.1em]"
                style={{ fontSize: 11, color: 'oklch(70% 0.02 92)' }}
              >
                Ranks 4 and below — top 3 revealed next
              </p>
            )}
          </div>
          {rest.length > 0 && restList(false)}
          <button
            onClick={() => setStep('third')}
            className="w-full max-w-[260px] font-bungee uppercase tracking-wide rounded-[12px] py-3.5 transition-[filter] hover:brightness-110 active:scale-95"
            style={{ background: 'oklch(80% 0.16 92)', color: 'oklch(30% 0.03 60)', fontSize: 13 }}
          >
            Reveal Top 3 ▶
          </button>
        </motion.div>

      )}
      {step === 'third'  && medalStep(top3[2], () => setStep('second'), 'third')}
      {step === 'second' && medalStep(top3[1], () => setStep('first'),  'second')}
      {step === 'first'  && medalStep(top3[0], () => setStep('podium'), 'first')}
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
                    {idx === 1 ? (
                      <DotLottieReact src="/lottie/crown.json" autoplay loop style={{ width: 36, height: 36 }} />
                    ) : idx === 0 ? (
                      <DotLottieReact src="/lottie/medal-2nd-silver.json" autoplay style={{ width: 32, height: 32 }} />
                    ) : (
                      <DotLottieReact src="/lottie/medal-3rd-bronze.json" autoplay style={{ width: 32, height: 32 }} />
                    )}
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
