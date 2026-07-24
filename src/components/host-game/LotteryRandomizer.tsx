import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playDrumroll, playRevealStep } from '@/lib/sounds';
import { gameThemes, alpha } from '@/lib/game-themes';
import { Confetti } from './Confetti';

const theme = gameThemes.find((g) => g.id === 'qgame')!;
const GOLD_COLORS = ['hsl(45, 95%, 55%)', 'hsl(45, 90%, 70%)', '#fff8dc'];

interface LotteryRandomizerProps {
  lotteryState?: {
    min: number;
    max: number;
    remainingPool: number[];
    currentDrawnNumber: number | null;
    history: number[];
    confettiPlays: number;
  };
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
  const [showBurst, setShowBurst] = useState(false);

  const prevDrawnNumberRef = useRef(lotteryState?.currentDrawnNumber);
  const prevConfettiPlaysRef = useRef(lotteryState?.confettiPlays ?? 0);

  useEffect(() => {
    // If a new number has been drawn, animate to it
    const current = lotteryState?.currentDrawnNumber;
    if (current !== undefined && current !== null && current !== prevDrawnNumberRef.current) {
      prevDrawnNumberRef.current = current;
      startRollingAnimation(current);
    } else if (current === undefined || current === null) {
      setDisplayNumber('???');
    } else if (!isAnimating) {
      // If we join late and there's already a drawn number, just show it
      setDisplayNumber(current);
    }
  }, [lotteryState?.currentDrawnNumber]);

  // Confetti burst — fires whenever the shared confettiPlays counter changes (a draw or a
  // manual replay), synced through Firestore so a separate projector window sees it too.
  useEffect(() => {
    const plays = lotteryState?.confettiPlays ?? 0;
    if (plays > 0 && plays !== prevConfettiPlaysRef.current) {
      prevConfettiPlaysRef.current = plays;
      setShowBurst(true);
      const timer = setTimeout(() => setShowBurst(false), 3000);
      return () => clearTimeout(timer);
    }
    prevConfettiPlaysRef.current = plays;
  }, [lotteryState?.confettiPlays]);

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

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 outline-none relative z-10">
      {showBurst && (
        <>
          <Confetti colors={GOLD_COLORS} />
          {projectorMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed top-[12%] left-1/2 -translate-x-1/2 z-50 font-bungee uppercase tracking-widest text-4xl md:text-6xl"
              style={{
                backgroundImage: 'linear-gradient(90deg, hsl(45,90%,60%) 0%, #fff8dc 50%, hsl(45,90%,60%) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              Congratulations
            </motion.div>
          )}
        </>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl text-center space-y-8"
      >
        <div
          className="inline-block font-bungee text-[12px] uppercase tracking-widest px-5 py-2 rounded-full mb-2"
          style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
        >
          Lottery Draw
        </div>

        {/* Slot Machine Display */}
        <div
          className="p-8 rounded-2xl border-4 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden backdrop-blur-sm"
          style={{
            background: 'rgba(0,0,0,0.3)',
            borderColor: alpha(theme.color1, 0.35),
            boxShadow: `0 0 50px ${alpha(theme.color1, 0.15)}`,
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={displayNumber}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`font-sugo text-transparent bg-clip-text ${projectorMode ? 'text-[150px] leading-[150px]' : 'text-[100px] leading-[100px]'}`}
              style={{ backgroundImage: `linear-gradient(180deg, #ffffff, ${theme.color1})` }}
            >
              {displayNumber}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Draw history */}
        {!needsInit && lotteryState.history.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {lotteryState.history.map((n, i) => (
              <span
                key={i}
                className="font-bold text-sm px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {/* Controls - Only visible to host */}
        {!projectorMode && (
          <div className="bg-card/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl w-full max-w-md mx-auto space-y-6">
            {needsInit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 text-left">
                    <label className="text-sm text-white/70 font-bungee">Start Number</label>
                    <Input
                      type="number"
                      value={min}
                      onChange={(e) => setMin(Number(e.target.value))}
                      className="bg-black/50 border-white/20 text-white font-bungee text-lg"
                    />
                  </div>
                  <div className="space-y-2 text-left">
                    <label className="text-sm text-white/70 font-bungee">End Number</label>
                    <Input
                      type="number"
                      value={max}
                      onChange={(e) => setMax(Number(e.target.value))}
                      className="bg-black/50 border-white/20 text-white font-bungee text-lg"
                    />
                  </div>
                </div>
                <div className="flex gap-4 mt-2">
                  <Button
                    onClick={handleInitialize}
                    className="flex-1 font-bold py-6 text-sm md:text-base tracking-wider"
                    style={{ background: theme.color1, color: theme.onColor1 }}
                  >
                    SAVE RANGE
                  </Button>
                  <Button
                    onClick={onContinue}
                    variant="outline"
                    className="flex-1 font-bold py-6 text-sm md:text-base tracking-wider"
                    style={{ borderColor: theme.color1, color: theme.color1 }}
                  >
                    SKIP LOTTERY
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-white/70 font-bungee text-sm mb-4">
                  Numbers remaining: {lotteryState.remainingPool.length}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={onDraw}
                    disabled={isAnimating || lotteryState.remainingPool.length === 0}
                    className="flex-1 font-bold py-6 text-base tracking-wider disabled:opacity-50"
                    style={{ background: theme.color1, color: theme.onColor1 }}
                  >
                    DRAW {lotteryState.currentDrawnNumber !== null ? 'AGAIN' : 'NUMBER'}
                  </Button>
                  <Button
                    onClick={onReplayConfetti}
                    disabled={isAnimating || lotteryState.currentDrawnNumber === null}
                    variant="outline"
                    title="Replay confetti"
                    className="w-14 flex-shrink-0 py-6"
                    style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'hsl(45, 90%, 60%)' }}
                  >
                    <PartyPopper className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={onContinue}
                    disabled={isAnimating}
                    variant="outline"
                    className="flex-1 font-bold py-6 text-base tracking-wider"
                    style={{ borderColor: theme.color1, color: theme.color1 }}
                  >
                    CONTINUE
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {projectorMode && lotteryState?.currentDrawnNumber === null && (
          <p className="text-white/50 text-xl font-sugo animate-pulse mt-8">
            Waiting for host to spin...
          </p>
        )}
      </motion.div>
    </div>
  );
}
