import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LotteryRandomizerProps {
  lotteryState?: {
    min: number;
    max: number;
    remainingPool: number[];
    currentDrawnNumber: number | null;
  };
  projectorMode: boolean;
  onInitialize: (min: number, max: number) => void;
  onDraw: () => void;
  onContinue: () => void;
}

export function LotteryRandomizer({
  lotteryState,
  projectorMode,
  onInitialize,
  onDraw,
  onContinue,
}: LotteryRandomizerProps) {
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(150);
  const [displayNumber, setDisplayNumber] = useState<number | string>('???');
  const [isAnimating, setIsAnimating] = useState(false);
  
  const prevDrawnNumberRef = useRef(lotteryState?.currentDrawnNumber);

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

  const startRollingAnimation = (finalNumber: number) => {
    setIsAnimating(true);
    let frames = 0;
    const maxFrames = 40; // ~2 seconds of animation at 20fps
    
    const interval = setInterval(() => {
      frames++;
      // Show random number in range
      const randomDisplay = Math.floor(Math.random() * (lotteryState?.max || max)) + (lotteryState?.min || min);
      setDisplayNumber(randomDisplay);
      
      if (frames >= maxFrames) {
        clearInterval(interval);
        setDisplayNumber(finalNumber);
        setIsAnimating(false);
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl text-center space-y-8"
      >
        <h2 className={`font-bungee text-[#adbbff] uppercase tracking-wider drop-shadow-md ${projectorMode ? 'text-5xl mb-12' : 'text-3xl mb-6'}`}>
          Lottery
        </h2>

        {/* Slot Machine Display */}
        <div className="bg-black/30 p-8 rounded-2xl border-4 border-[#adbbff]/30 shadow-[0_0_50px_rgba(173,187,255,0.15)] flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden backdrop-blur-sm">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={displayNumber}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`font-sugo text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] to-[#adbbff] ${
                projectorMode ? 'text-[150px] leading-[150px]' : 'text-[100px] leading-[100px]'
              }`}
            >
              {displayNumber}
            </motion.div>
          </AnimatePresence>
        </div>

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
                    className="flex-1 bg-[#adbbff] hover:bg-[#92a1eb] text-[#120524] font-bold py-6 text-sm md:text-base tracking-wider"
                  >
                    SAVE RANGE
                  </Button>
                  <Button 
                    onClick={onContinue}
                    variant="outline"
                    className="flex-1 border-[#adbbff] text-[#adbbff] hover:bg-[#adbbff]/10 font-bold py-6 text-sm md:text-base tracking-wider"
                  >
                    SKIP LOTTERY
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-white/70 font-bungee text-sm mb-4">
                  Numbers remaining: {lotteryState?.remainingPool.length}
                </p>
                <div className="flex gap-4">
                  <Button 
                    onClick={onDraw}
                    disabled={isAnimating || lotteryState?.remainingPool.length === 0}
                    className="flex-1 bg-[#adbbff] hover:bg-[#92a1eb] text-[#120524] font-bold py-6 text-base tracking-wider disabled:opacity-50"
                  >
                    DRAW {lotteryState?.currentDrawnNumber !== null ? 'AGAIN' : 'NUMBER'}
                  </Button>
                  <Button 
                    onClick={onContinue}
                    disabled={isAnimating}
                    variant="outline"
                    className="flex-1 border-[#adbbff] text-[#adbbff] hover:bg-[#adbbff]/10 font-bold py-6 text-base tracking-wider"
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
