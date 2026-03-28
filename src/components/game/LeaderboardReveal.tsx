import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Team } from '@/types/game'; // Antigravity uses 'Team' from game types here
import { playFanfare, playDrumroll, playRevealStep } from '@/lib/sounds';
import { Emoji3D } from '@/components/ui/Emoji3D';

interface LeaderboardRevealProps {
  teams: Team[];
  isFinal: boolean;
  currentRound: number;
  onContinue: () => void;
  projectorMode?: boolean;
  revealStep?: number;
  onSetRevealStep?: (step: number) => void;
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    color: ['hsl(185, 90%, 50%)', 'hsl(330, 90%, 60%)', 'hsl(45, 95%, 55%)', 'hsl(145, 80%, 42%)', 'hsl(270, 80%, 60%)'][Math.floor(Math.random() * 5)],
    size: 6 + Math.random() * 8,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export function LeaderboardReveal({
  teams,
  isFinal,
  currentRound,
  onContinue,
  projectorMode,
  revealStep = 0,
  onSetRevealStep
}: LeaderboardRevealProps) {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const soundPlayed = useRef(false);

  useEffect(() => {
    if (!isFinal) return;
    if ((revealStep === 1 && sorted.length >= 3) || (revealStep === 2 && sorted.length >= 2)) {
      playRevealStep();
    }
    if (revealStep === 3 && !soundPlayed.current) {
      soundPlayed.current = true;
      playFanfare();
    }
  }, [revealStep, isFinal, sorted.length]);

  if (!isFinal) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex flex-col items-center gap-4 w-full mx-auto px-4 ${projectorMode ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <h2 className={`font-bold text-primary text-glow-primary ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>
          Standings after Round {currentRound}
        </h2>
        <div className="w-full space-y-2 mt-2">
          {sorted.map((team, i) => (
            <motion.div
              key={team.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card border-border"
            >
              <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
              <Emoji3D emoji={team.emoji} className="w-6 h-6" />
              <span className={`flex-1 font-semibold ${team.isPlayer ? 'text-primary' : 'text-foreground'}`}>
                {team.name}
              </span>
              <span className="font-bold tabular-nums text-lg">{team.score}</span>
            </motion.div>
          ))}
        </div>
        <Button onClick={onContinue} className="w-full py-3 h-auto text-base font-bold rounded-xl mt-2">
          {currentRound < 6 ? 'Next Round' : 'See Final Results'}
        </Button>
      </motion.div>
    );
  }

  const rest = sorted.slice(3);
  const bronze = sorted[2];
  const silver = sorted[1];
  const gold = sorted[0];

  return (
    <AnimatePresence mode="wait">
      {/* STEP 0 - The Rest */}
      {revealStep === 0 && (
        <motion.div key="rest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-lg mx-auto">
          <h2 className="text-2xl font-bold text-primary text-center mb-4">Final Standings</h2>
          <div className="space-y-2">
            {rest.map((team, i) => (
              <div key={team.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card border-border">
                <span className="text-lg font-bold text-muted-foreground w-6">{i + 4}</span>
                <Emoji3D emoji={team.emoji} className="w-6 h-6" />
                <span className="flex-1 font-semibold">{team.name}</span>
                <span className="font-bold tabular-nums">{team.score}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => onSetRevealStep?.(1)} className="w-full py-3 font-bold rounded-xl mt-4">
            Reveal 3rd Place →
          </Button>
        </motion.div>
      )}

      {/* STEP 1 - BRONZE */}
      {revealStep === 1 && bronze && (
        <motion.div key="bronze" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 text-center">
          <span className="text-6xl">🥉</span>
          <h2 className="text-3xl font-bold">3rd Place</h2>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Emoji3D emoji={bronze.emoji} className="w-8 h-8" />
            {bronze.name}
          </div>
          <p className="text-4xl font-bold tabular-nums">{bronze.score} pts</p>
          <Button onClick={() => onSetRevealStep?.(2)} className="w-full max-w-xs py-3 font-bold rounded-xl mt-4">
            Reveal 2nd Place →
          </Button>
        </motion.div>
      )}

      {/* STEP 2 - SILVER */}
      {revealStep === 2 && silver && (
        <motion.div key="silver" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 text-center">
          <span className="text-7xl">🥈</span>
          <h2 className="text-3xl font-bold">2nd Place</h2>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Emoji3D emoji={silver.emoji} className="w-8 h-8" />
            {silver.name}
          </div>
          <p className="text-4xl font-bold tabular-nums">{silver.score} pts</p>
          <Button onClick={() => { playDrumroll(); setTimeout(() => onSetRevealStep?.(3), 1500); }} className="w-full max-w-xs py-3 font-bold rounded-xl mt-4">
            Reveal the Winner →
          </Button>
        </motion.div>
      )}

      {/* STEP 3 - GOLD */}
      {revealStep === 3 && gold && (
        <motion.div key="gold" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 text-center">
          <Confetti />
          <Trophy className="w-20 h-20 text-gold animate-float" />
          <h2 className="text-4xl font-bold text-gold">🏆 WINNER!</h2>
          <div className="flex items-center justify-center gap-2 text-3xl font-bold">
            <Emoji3D emoji={gold.emoji} className="w-10 h-10" />
            {gold.name}
          </div>
          <p className="text-5xl font-bold text-gold tabular-nums">{gold.score} pts</p>
          <Button onClick={onContinue} className="w-full max-w-xs py-3 font-bold rounded-xl mt-4">
            Finish Game
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}