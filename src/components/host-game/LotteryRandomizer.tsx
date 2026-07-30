import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playDrumroll, playRevealStep } from '@/lib/sounds';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

interface LotteryRandomizerProps {
  lotteryState?: {
    min: number;
    max: number;
    remainingPool: number[];
    currentDrawnNumber: number | null;
    history: number[];
    confettiPlays: number;
  } | null;
  projectorMode: boolean;
  onInitialize: (min: number, max: number) => void;
  onDraw: () => void;
  onContinue: () => void;
  onReplayConfetti: () => void;
}

export function LotteryRandomizer({
  lotteryState,
  projectorMode,
  onInitialize,
  onDraw,
  onContinue,
  onReplayConfetti,
}: LotteryRandomizerProps) {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(150);
  const [displayNumber, setDisplayNumber] = useState<number | string>('???');
  const [isAnimating, setIsAnimating] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  const prevDrawnNumberRef = useRef(lotteryState?.currentDrawnNumber);
  const prevConfettiPlaysRef = useRef(lotteryState?.confettiPlays ?? 0);
  const burstIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const burstStopTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // The roll animation is host-only — the projector just reflects the drawn number directly.
    const current = lotteryState?.currentDrawnNumber;
    if (current === undefined || current === null) {
      setDisplayNumber('???');
    } else if (projectorMode) {
      setDisplayNumber(current);
    } else if (current !== prevDrawnNumberRef.current) {
      prevDrawnNumberRef.current = current;
      startRollingAnimation(current);
    } else if (!isAnimating) {
      // If we join late and there's already a drawn number, just show it
      setDisplayNumber(current);
    }
  }, [lotteryState?.currentDrawnNumber, projectorMode]);

  // Confetti — fires 5 pulses (1.4s active / 5s apart), matching the design's replayLotteryConfetti,
  // whenever the shared confettiPlays counter changes (a draw or a manual replay), synced through
  // Firestore so a separate projector window sees it too.
  useEffect(() => {
    const plays = lotteryState?.confettiPlays ?? 0;
    if (plays > 0 && plays !== prevConfettiPlaysRef.current) {
      prevConfettiPlaysRef.current = plays;

      let pulses = 0;
      const maxPulses = 5;
      const fire = () => {
        pulses++;
        setConfettiActive(true);
        clearTimeout(burstStopTimerRef.current);
        burstStopTimerRef.current = setTimeout(() => setConfettiActive(false), 1400);
        if (pulses >= maxPulses) clearInterval(burstIntervalRef.current);
      };
      fire();
      clearInterval(burstIntervalRef.current);
      burstIntervalRef.current = setInterval(fire, 5000);
    } else {
      prevConfettiPlaysRef.current = plays;
    }
  }, [lotteryState?.confettiPlays]);

  useEffect(() => {
    return () => {
      clearInterval(burstIntervalRef.current);
      clearTimeout(burstStopTimerRef.current);
    };
  }, []);

  const startRollingAnimation = (finalNumber: number) => {
    setIsAnimating(true);
    let frames = 0;
    const maxFrames = 30; // ~1.5 seconds of animation at 20fps

    playDrumroll();

    const interval = setInterval(() => {
      frames++;
      // Show random number in range
      const randomDisplay = Math.floor(Math.random() * (lotteryState?.max || max)) + (lotteryState?.min || min);
      setDisplayNumber(randomDisplay);

      if (frames >= maxFrames) {
        clearInterval(interval);
        setDisplayNumber(finalNumber);
        setIsAnimating(false);
        playRevealStep();
      }
    }, 50);
  };

  const handleInitialize = () => {
    if (min >= max) {
      alert("Start number must be less than End number");
      return;
    }
    onInitialize(min, max);
  };

  const needsInit = !lotteryState;
  const isRevealed = !!lotteryState && lotteryState.currentDrawnNumber !== null && !isAnimating;

  // Projector mirrors the design's separate fullscreen overlay: no badge, no card, no controls —
  // just the giant shimmering number, the auto-firing gold confetti once revealed, and a
  // "Congratulations" banner that stays up for as long as the round stays revealed.
  if (projectorMode) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 outline-none relative z-10">
        {confettiActive && (
          <DotLottieReact
            src="https://lottie.host/79266ebc-8b4a-4b7c-a1a0-326ac1057a23/JU5NbpIPAL.lottie"
            autoplay
            renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
            style={{
              position: 'fixed', top: '50%', left: '50%', width: '100%', height: '100%',
              minWidth: '130vh', minHeight: '130vh', transform: 'translate(-50%,-50%) rotate(90deg)', zIndex: 1,
              filter: 'grayscale(1) sepia(1) saturate(4) hue-rotate(-8deg) brightness(1.05)',
              pointerEvents: 'none',
            }}
          />
        )}

        {isRevealed && (
          <div
            className="congrats-text font-bungee uppercase tracking-widest text-[34px] relative z-10"
            style={{
              backgroundImage: 'linear-gradient(90deg, hsl(45,90%,60%) 0%, #fff8dc 50%, hsl(45,90%,60%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            Congratulations
          </div>
        )}

        <span
          className="congrats-text font-bungee text-transparent bg-clip-text text-[180px] leading-[180px] relative z-10"
          style={{ backgroundImage: 'linear-gradient(90deg, hsl(45,90%,60%) 0%, #fff8dc 50%, hsl(45,90%,60%) 100%)' }}
        >
          {displayNumber}
        </span>

        {lotteryState?.currentDrawnNumber === null && (
          <p className="text-white/50 text-xl relative z-10">Waiting for host to draw...</p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center max-w-4xl mx-auto px-4 outline-none relative z-10">
      <div
        className="font-bungee text-[12px] uppercase tracking-widest px-[18px] py-[7px] rounded-2xl"
        style={{ background: alpha(theme.color1, 0.19), border: `1px solid ${alpha(theme.color1, 0.44)}`, color: theme.color1 }}
      >
        Lottery Draw
      </div>

      <div className="flex-1 w-full max-w-[560px] flex flex-col items-center justify-center gap-7 min-h-0">
        {/* Slot Machine Display */}
        <div
          className="w-full rounded-[20px] flex items-center justify-center relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `3px solid ${alpha(theme.color1, 0.33)}`,
            boxShadow: `0 0 50px ${alpha(theme.color1, 0.13)}`,
            minHeight: 200,
            padding: 36,
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={displayNumber}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="font-bungee text-transparent bg-clip-text text-[88px] leading-[88px]"
              style={{ backgroundImage: `linear-gradient(180deg, #ffffff, ${theme.color1})` }}
            >
              {displayNumber}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        {(
          needsInit ? (
            <div
              className="w-full rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <div className="flex gap-3.5">
                <div className="flex-1 flex flex-col gap-1.5 text-left">
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Start Number
                  </label>
                  <Input
                    type="number"
                    value={min}
                    onChange={(e) => setMin(Number(e.target.value))}
                    className="bg-black/40 border-white/20 text-white text-base h-auto py-2.5 px-3 rounded-lg"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5 text-left">
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    End Number
                  </label>
                  <Input
                    type="number"
                    value={max}
                    onChange={(e) => setMax(Number(e.target.value))}
                    className="bg-black/40 border-white/20 text-white text-base h-auto py-2.5 px-3 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3.5">
                <Button
                  onClick={handleInitialize}
                  className="flex-1 h-auto font-bungee text-[13px] tracking-wider uppercase rounded-[9px] py-3.5"
                  style={{ background: theme.color1, color: theme.onColor1 }}
                >
                  Save Range
                </Button>
                <Button
                  onClick={onContinue}
                  variant="outline"
                  className="flex-1 h-auto font-bungee text-[13px] tracking-wider uppercase rounded-[9px] py-3 bg-transparent hover:bg-transparent hover:text-current"
                  style={{ borderColor: theme.color1, color: theme.color1, borderWidth: 2 }}
                >
                  Skip Lottery
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-4">
              <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Numbers remaining: {lotteryState.remainingPool.length}
              </p>
              <div className="flex gap-3.5">
                <Button
                  onClick={onDraw}
                  disabled={isAnimating || lotteryState.remainingPool.length === 0}
                  className="flex-1 h-auto font-bungee text-sm tracking-wider uppercase rounded-[10px] py-4"
                  style={{ background: theme.color1, color: theme.onColor1 }}
                >
                  {lotteryState.currentDrawnNumber !== null ? 'Draw Again' : 'Draw Number'}
                </Button>
                <Button
                  onClick={onReplayConfetti}
                  disabled={isAnimating || lotteryState.currentDrawnNumber === null}
                  variant="outline"
                  title="Replay confetti"
                  className="w-12 h-auto flex-shrink-0 rounded-[10px] text-[18px] hover:bg-[rgba(255,255,255,0.08)] hover:text-current"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)', color: 'hsl(45, 90%, 60%)' }}
                >
                  🎉
                </Button>
                <Button
                  onClick={onContinue}
                  disabled={isAnimating}
                  variant="outline"
                  className="flex-1 h-auto font-bungee text-sm tracking-wider uppercase rounded-[10px] py-3.5 bg-transparent hover:bg-transparent hover:text-current"
                  style={{ borderColor: theme.color1, color: theme.color1, borderWidth: 2 }}
                >
                  Continue
                </Button>
              </div>

              {lotteryState.history.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-1.5">
                  {lotteryState.history.map((n, i) => (
                    <span
                      key={i}
                      className="font-bold text-sm px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
