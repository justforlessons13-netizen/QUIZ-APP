import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { playTick, playUrgentTick, playTimesUp } from '@/lib/sounds';

interface GameTimerProps {
  timeLeft: number;
  maxTime: number;
}

export function GameTimer({ timeLeft, maxTime }: GameTimerProps) {
  const prevTimeRef = useRef(timeLeft);

  useEffect(() => {
    // Only play on actual countdown (not initial render)
    if (prevTimeRef.current !== timeLeft && prevTimeRef.current > 0) {
      if (timeLeft === 0) {
        playTimesUp();
      } else if (timeLeft <= 3) {
        playUrgentTick();
      } else if (timeLeft <= 5) {
        playTick();
      }
    }
    prevTimeRef.current = timeLeft;
  }, [timeLeft]);
  const progress = maxTime > 0 ? timeLeft / maxTime : 0;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference * (1 - progress);

  const getStrokeColor = () => {
    if (progress > 0.5) return 'hsl(var(--primary))';
    if (progress > 0.25) return 'hsl(var(--gold))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="5"
        />
        <motion.circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold tabular-nums ${
          timeLeft <= 5 ? 'text-destructive animate-pulse' : timeLeft <= 10 ? 'text-gold' : 'text-foreground'
        }`}>
          {timeLeft}
        </span>
      </div>
    </div>
  );
}
