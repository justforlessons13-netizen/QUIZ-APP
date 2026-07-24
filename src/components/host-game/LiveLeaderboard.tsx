import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveTeam } from '@/types/live-game';
import { playFanfare, playDrumroll, playRevealStep } from '@/lib/sounds';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';
import { Confetti } from './Confetti';

const theme = gameThemes.find((g) => g.id === 'qgame')!;
const GOLD_COLORS = ['hsl(45, 95%, 55%)', 'hsl(45, 90%, 70%)', '#fff8dc'];
const ROW_HEIGHT = 62;

interface LiveLeaderboardProps {
  teams: LiveTeam[];
  isFinal: boolean;
  currentRound: number;
  onContinue: () => void;
  projectorMode?: boolean;
  revealStep?: number;
  onSetRevealStep?: (step: number) => void;
  winnerConfettiPlays?: number;
  onReplayWinnerConfetti?: () => void;
}

function sortTeams(teams: LiveTeam[]) {
  return [...teams].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    for (let i = b.roundScores.length - 1; i >= 0; i--) {
      const diff = (b.roundScores[i] || 0) - (a.roundScores[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

export function LiveLeaderboard({
  teams, isFinal, currentRound, onContinue, projectorMode, revealStep = 0, onSetRevealStep,
  winnerConfettiPlays = 0, onReplayWinnerConfetti,
}: LiveLeaderboardProps) {
  // Freeze the sort order the moment this screen mounts for this round — an unrelated score
  // adjustment (e.g. via Edit Scores) landing while this is open shouldn't reshuffle rows live.
  const [sorted] = useState(() => sortTeams(teams));

  // Rank deltas vs. before this round's scores, used for both the ▲/▼ badges and to animate
  // each row sliding in from its previous position into its new one.
  const prevTotal = (t: LiveTeam) => t.roundScores.slice(0, Math.max(0, currentRound - 1)).reduce((a, b) => a + b, 0);
  const prevSorted = [...teams].sort((a, b) => prevTotal(b) - prevTotal(a));
  const prevRank = new Map(prevSorted.map((t, i) => [t.id, i + 1]));
  const currRank = new Map(sorted.map((t, i) => [t.id, i + 1]));

  const soundPlayed = useRef(false);

  // Hooks must run unconditionally every render, so this lives above the isFinal early-return
  // even though it only matters for the final (podium) sequence.
  useEffect(() => {
    if (!isFinal) return;
    if ((revealStep === 1 && sorted.length >= 3) || (revealStep === 2 && sorted.length === 2)) {
      playRevealStep();
    }
    if (revealStep === 3 && !soundPlayed.current) {
      soundPlayed.current = true;
      playFanfare();
    }
  }, [isFinal, revealStep, sorted.length]);

  if (!isFinal) {
    const roundCol = projectorMode ? 'w-14' : 'w-9';
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`flex flex-col items-center gap-3 w-full mx-auto px-4 ${projectorMode ? 'max-w-4xl' : 'max-w-2xl'}`}
      >
        <div
          className={`font-bungee uppercase tracking-widest rounded-full ${projectorMode ? 'text-sm px-6 py-2' : 'text-[11px] px-4 py-1.5'}`}
          style={{ background: alpha(theme.color1, 0.13), border: `1px solid ${alpha(theme.color1, 0.27)}`, color: theme.color1 }}
        >
          Leaderboard — After Round {currentRound}
        </div>

        <div className="w-full">
          <div
            className={`flex items-center gap-2.5 px-3.5 pb-2 border-b border-border text-muted-foreground uppercase tracking-widest ${projectorMode ? 'text-sm' : 'text-[10px]'}`}
          >
            <span className={projectorMode ? 'w-8' : 'w-[22px]'}>#</span>
            <span className={projectorMode ? 'w-6' : 'w-[18px]'} />
            <span className="flex-1">Team</span>
            {Array.from({ length: currentRound }, (_, i) => (
              <span key={i} className={`text-center flex-shrink-0 ${roundCol}`}>R{i + 1}</span>
            ))}
            <span className={`text-right flex-shrink-0 ${projectorMode ? 'w-20' : 'w-12'}`}>Total</span>
          </div>
          {sorted.map((team) => {
            const rank = currRank.get(team.id)!;
            const delta = (prevRank.get(team.id) ?? rank) - rank;
            const yOffset = delta * -ROW_HEIGHT;
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: yOffset }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
                className={`flex items-center gap-2.5 px-3.5 border-b border-border/50 ${projectorMode ? 'py-3.5' : 'py-2.5'}`}
              >
                <span className={`font-extrabold ${projectorMode ? 'w-8 text-xl' : 'w-[22px] text-sm'}`}>{rank}</span>
                <span className={`flex-shrink-0 flex items-center ${projectorMode ? 'w-6' : 'w-[18px]'}`}>
                  {delta > 0 && (
                    <span className="flex items-center font-bold text-success animate-bounce" style={{ fontSize: projectorMode ? 14 : 10 }}>
                      ▲{delta}
                    </span>
                  )}
                  {delta < 0 && (
                    <span className="flex items-center font-bold text-destructive animate-bounce" style={{ fontSize: projectorMode ? 14 : 10 }}>
                      ▼{Math.abs(delta)}
                    </span>
                  )}
                </span>
                <Emoji3D emoji={team.emoji} className={`flex-shrink-0 ${projectorMode ? 'w-7 h-7' : 'w-[18px] h-[18px]'}`} />
                <span className={`flex-1 font-bold text-foreground truncate ${projectorMode ? 'text-lg' : 'text-[13px]'}`}>{team.name}</span>
                {Array.from({ length: currentRound }, (_, i) => (
                  <span
                    key={i}
                    className={`text-center flex-shrink-0 text-muted-foreground tabular-nums ${roundCol} ${projectorMode ? 'text-base' : 'text-[11px]'}`}
                  >
                    {team.roundScores[i] ?? 0}
                  </span>
                ))}
                <span
                  className={`text-right font-extrabold tabular-nums flex-shrink-0 ${projectorMode ? 'w-20 text-2xl' : 'w-12 text-[15px]'}`}
                  style={{ color: theme.color1 }}
                >
                  {team.score}
                </span>
              </motion.div>
            );
          })}
        </div>

        {!projectorMode && (
          <button
            onClick={onContinue}
            className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 mt-2"
            style={{
              background: 'transparent',
              border: `2px solid ${theme.color1}`,
              color: theme.color1,
              boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}`,
            }}
          >
            Continue ▶
          </button>
        )}
      </motion.div>
    );
  }

  // ── Final sequence: rest-list → bronze → silver → gold → combined podium ──
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
          <h2 className={`font-bungee uppercase tracking-wide ${projectorMode ? 'text-4xl' : 'text-2xl'}`} style={{ color: theme.color1 }}>
            Final Standings
          </h2>
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
          {!projectorMode && (
            <button
              onClick={() => onSetRevealStep?.(sorted.length >= 3 ? 1 : sorted.length === 2 ? 2 : 3)}
              className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 mt-2"
              style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
            >
              {sorted.length >= 3 ? "Reveal 3rd Place ▼" : "Reveal the Winner ▼"}
            </button>
          )}
        </motion.div>
      )}

      {/* STEP 1 - BRONZE */}
      {revealStep === 1 && bronze && (
        <motion.div key="bronze" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 px-4 text-center">
          <Medal className={`text-bronze ${projectorMode ? 'w-24 h-24' : 'w-16 h-16'}`} />
          <h2 className={`font-bold text-bronze ${projectorMode ? 'text-5xl' : 'text-3xl'}`}>3rd Place</h2>
          <p className={`font-bold flex items-center justify-center gap-2 ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>
            <Emoji3D emoji={bronze.emoji} className={projectorMode ? 'w-10 h-10' : 'w-8 h-8'} />
            {bronze.name}
          </p>
          <p className={`font-bold tabular-nums ${projectorMode ? 'text-6xl' : 'text-4xl'}`}>{bronze.score} pts</p>
          {!projectorMode && (
            <button
              onClick={() => onSetRevealStep?.(2)}
              className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 mt-4"
              style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
            >
              Reveal 2nd Place ▼
            </button>
          )}
        </motion.div>
      )}

      {/* STEP 2 - SILVER */}
      {revealStep === 2 && silver && (
        <motion.div key="silver" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 px-4 text-center">
          <Medal className={`text-silver ${projectorMode ? 'w-28 h-28' : 'w-20 h-20'}`} />
          <h2 className={`font-bold text-silver ${projectorMode ? 'text-5xl' : 'text-3xl'}`}>2nd Place</h2>
          <p className={`font-bold flex items-center justify-center gap-2 ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>
            <Emoji3D emoji={silver.emoji} className={projectorMode ? 'w-10 h-10' : 'w-8 h-8'} />
            {silver.name}
          </p>
          <p className={`font-bold tabular-nums ${projectorMode ? 'text-6xl' : 'text-4xl'}`}>{silver.score} pts</p>
          {!projectorMode && (
            <button
              onClick={() => { playDrumroll(); setTimeout(() => onSetRevealStep?.(3), 1500); }}
              className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 mt-4"
              style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
            >
              Reveal the Winner ▼
            </button>
          )}
        </motion.div>
      )}

      {/* STEP 3 - GOLD */}
      {revealStep === 3 && gold && (
        <motion.div key="gold" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 px-4 text-center relative">
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
          {!projectorMode && (
            <button
              onClick={() => onSetRevealStep?.(4)}
              className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 mt-4 border-gold text-gold"
              style={{ background: 'transparent', borderWidth: 2, borderStyle: 'solid', boxShadow: `0 0 20px ${alpha(GOLD_COLORS[0], 0.3)}` }}
            >
              See Final Standings ▶
            </button>
          )}
        </motion.div>
      )}

      {/* STEP 4 - COMBINED PODIUM */}
      {revealStep === 4 && gold && (
        <motion.div
          key="podium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto px-4 relative"
        >
          {winnerConfettiPlays > 0 && <Confetti colors={GOLD_COLORS} />}

          <div
            className="font-bungee text-[12px] uppercase tracking-widest px-5 py-2 rounded-full"
            style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
          >
            Final Standings
          </div>

          <div className="flex items-end gap-3 mt-2">
            {silver && (
              <div className="flex flex-col items-center gap-1 w-28">
                <Emoji3D emoji={silver.emoji} className="w-8 h-8" />
                <span className="text-xs font-bold text-center truncate w-full">{silver.name}</span>
                <div className="w-full h-[76px] rounded-t-lg flex flex-col items-center justify-center gap-1" style={{ background: 'rgba(200,200,210,0.15)', border: '1.5px solid rgba(200,200,210,0.6)' }}>
                  <Medal className="w-6 h-6 text-silver" />
                  <span className="text-xs font-extrabold text-silver">{silver.score}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-1 w-32">
              <Emoji3D emoji={gold.emoji} className="w-10 h-10" />
              <span className="text-sm font-bold text-center truncate w-full">{gold.name}</span>
              <div className="w-full h-[104px] rounded-t-lg flex flex-col items-center justify-center gap-1.5" style={{ background: alpha(theme.color1, 0.25), border: `1.5px solid ${theme.color1}` }}>
                <Trophy className="w-8 h-8 text-gold" />
                <span className="text-sm font-extrabold text-gold">{gold.score}</span>
              </div>
            </div>
            {bronze && (
              <div className="flex flex-col items-center gap-1 w-28">
                <Emoji3D emoji={bronze.emoji} className="w-7 h-7" />
                <span className="text-xs font-bold text-center truncate w-full">{bronze.name}</span>
                <div className="w-full h-[60px] rounded-t-lg flex flex-col items-center justify-center gap-1" style={{ background: 'rgba(180,120,70,0.15)', border: '1.5px solid rgba(180,120,70,0.7)' }}>
                  <Medal className="w-5 h-5 text-bronze" />
                  <span className="text-xs font-extrabold text-bronze">{bronze.score}</span>
                </div>
              </div>
            )}
          </div>

          {rest.length > 0 && (
            <div className="w-full max-w-md flex flex-col gap-1.5">
              {rest.map((team, i) => (
                <div key={team.id} className="flex items-center gap-2.5 rounded-lg px-3.5 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-xs font-extrabold w-5">{i + 4}</span>
                  <Emoji3D emoji={team.emoji} className="w-4 h-4" />
                  <span className="flex-1 text-sm font-semibold truncate">{team.name}</span>
                  <span className="text-sm font-extrabold" style={{ color: theme.color1 }}>{team.score}</span>
                </div>
              ))}
            </div>
          )}

          {!projectorMode && (
            <div className="flex items-center gap-3 mt-2">
              <Button
                onClick={() => onReplayWinnerConfetti?.()}
                variant="outline"
                title="Replay confetti"
                className="w-12 h-12 p-0"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'hsl(45, 90%, 60%)' }}
              >
                <PartyPopper className="w-5 h-5" />
              </Button>
              <button
                onClick={onContinue}
                className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-10 py-4"
                style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
              >
                Finish Game ▶
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LiveLeaderboard;
