import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveTeam } from '@/types/live-game';
import { playFanfare, playDrumroll, playRevealStep } from '@/lib/sounds';
import { Emoji3D } from '@/components/ui/Emoji3D';

interface LiveLeaderboardProps {
  teams: LiveTeam[];
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

export function LiveLeaderboard({
  teams, isFinal, currentRound, onContinue, projectorMode, revealStep = 0, onSetRevealStep
}: LiveLeaderboardProps) {
  const sorted = [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    for (let i = b.roundScores.length - 1; i >= 0; i--) {
      const diff = (b.roundScores[i] || 0) - (a.roundScores[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

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
        exit={{ opacity: 0 }}
        className={`flex flex-col items-center gap-4 w-full mx-auto px-4 ${projectorMode ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <h2 className={`font-bold text-primary text-glow-primary ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>
          Standings after Round {currentRound}
        </h2>
        <div className="w-full space-y-2 mt-2">
          {sorted.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-card border-border ${projectorMode ? 'px-6 py-4' : ''}`}
            >
              <span className={`font-bold text-muted-foreground w-6 ${projectorMode ? 'text-2xl' : 'text-lg'}`}>{i + 1}</span>
              <Emoji3D emoji={team.emoji} className={projectorMode ? 'w-8 h-8' : 'w-6 h-6'} />
              <span className={`flex-1 font-semibold text-foreground ${projectorMode ? 'text-xl' : ''}`}>{team.name}</span>
              <span className={`font-bold tabular-nums ${projectorMode ? 'text-2xl' : 'text-lg'}`}>{team.score}</span>
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
      {/* STEP 0 */}
      {revealStep === 0 && (
        <motion.div
          key="rest"
          className={`flex flex-col items-center gap-4 w-full mx-auto px-4 ${projectorMode ? 'max-w-2xl' : 'max-w-lg'}`}
        >
          <h2 className={`font-bold text-primary text-glow-primary ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>Final Standings</h2>
          <div className="w-full space-y-2 mt-2">
            {rest.map((team, i) => (
              <motion.div key={team.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card border-border">
                <span className="text-lg font-bold text-muted-foreground w-6">{i + 4}</span>
                <Emoji3D emoji={team.emoji} className="w-6 h-6" />
                <span className="flex-1 font-semibold">{team.name}</span>
                <span className="font-bold tabular-nums">{team.score}</span>
              </motion.div>
            ))}
          </div>
          <Button
            onClick={() => onSetRevealStep?.(sorted.length >= 3 ? 1 : sorted.length === 2 ? 2 : 3)}
            className="w-full py-3 h-auto text-base font-bold rounded-xl mt-2"
          >
            {sorted.length >= 3 ? "Reveal 3rd Place →" : "Reveal the Winner →"}
          </Button>
        </motion.div>
      )}

      {/* STEP 1 - BRONZE */}
      {revealStep === 1 && bronze && (
        <motion.div key="bronze" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 px-4 text-center">
          <span className={`${projectorMode ? 'text-8xl' : 'text-6xl'}`}>🥉</span>
          <h2 className={`font-bold text-bronze ${projectorMode ? 'text-5xl' : 'text-3xl'}`}>3rd Place</h2>
          <p className={`font-bold flex items-center justify-center gap-2 ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>
            <Emoji3D emoji={bronze.emoji} className={projectorMode ? 'w-10 h-10' : 'w-8 h-8'} />
            {bronze.name}
          </p>
          <p className={`font-bold tabular-nums ${projectorMode ? 'text-6xl' : 'text-4xl'}`}>{bronze.score} pts</p>
          <Button onClick={() => onSetRevealStep?.(2)} className="w-full max-w-xs py-3 h-auto text-base font-bold rounded-xl mt-4">
            Reveal 2nd Place →
          </Button>
        </motion.div>
      )}

      {/* STEP 2 - SILVER */}
      {revealStep === 2 && silver && (
        <motion.div key="silver" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 px-4 text-center">
          <span className={`${projectorMode ? 'text-9xl' : 'text-7xl'}`}>🥈</span>
          <h2 className={`font-bold text-silver ${projectorMode ? 'text-5xl' : 'text-3xl'}`}>2nd Place</h2>
          <p className={`font-bold flex items-center justify-center gap-2 ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>
            <Emoji3D emoji={silver.emoji} className={projectorMode ? 'w-10 h-10' : 'w-8 h-8'} />
            {silver.name}
          </p>
          <p className={`font-bold tabular-nums ${projectorMode ? 'text-6xl' : 'text-4xl'}`}>{silver.score} pts</p>
          <Button onClick={() => { playDrumroll(); setTimeout(() => onSetRevealStep?.(3), 1500); }} className="w-full max-w-xs py-3 h-auto text-base font-bold rounded-xl mt-4">
            Reveal the Winner →
          </Button>
        </motion.div>
      )}

      {/* STEP 3 - GOLD */}
      {revealStep === 3 && gold && (
        <motion.div key="gold" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 px-4 text-center">
          <Confetti />
          <Trophy className={`text-gold animate-float ${projectorMode ? 'w-28 h-28' : 'w-20 h-20'}`} />
          <h2 className={`font-bold text-gold text-glow-gold ${projectorMode ? 'text-6xl' : 'text-4xl'}`}>🏆 WINNER!</h2>
          <p className={`font-bold flex items-center justify-center gap-2 ${projectorMode ? 'text-5xl' : 'text-3xl'}`}>
            <Emoji3D emoji={gold.emoji} className={projectorMode ? 'w-12 h-12' : 'w-10 h-10'} />
            {gold.name}
          </p>
          <p className={`font-bold tabular-nums text-gold text-glow-gold ${projectorMode ? 'text-7xl' : 'text-5xl'}`}>
            {gold.score} pts
          </p>
          <Button onClick={onContinue} className="w-full max-w-xs py-3 h-auto text-base font-bold rounded-xl mt-4">
            Finish Game
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LiveLeaderboard;