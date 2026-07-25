import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveTeam } from '@/types/live-game';
import { playFanfare, playDrumroll, playRevealStep } from '@/lib/sounds';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { gameThemes, alpha } from '@/lib/game-themes';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const theme = gameThemes.find((g) => g.id === 'qgame')!;
const GOLD_COLORS = ['hsl(45, 95%, 55%)', 'hsl(45, 90%, 70%)', '#fff8dc'];
// Explicit DPR so Lottie canvases render crisp on high-DPI/projector displays instead of
// relying on layout timing for the library's own window.devicePixelRatio default.
const DPR = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
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

  // Rows mount at their previous rank's position, then a tick later "settled" flips to true,
  // triggering the CSS `top` transition below so rows slide (not fly) into their new rank order.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 50);
    return () => clearTimeout(t);
  }, []);

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
        className="w-full flex-1 flex flex-col items-center px-4"
      >
      <div
        className={`font-bungee uppercase tracking-widest rounded-full flex-none ${projectorMode ? 'text-sm px-6 py-2' : 'text-[11px] px-4 py-1.5'}`}
        style={{ background: alpha(theme.color1, 0.13), border: `1px solid ${alpha(theme.color1, 0.27)}`, color: theme.color1, marginBottom: 12 }}
      >
        Leaderboard — After Round {currentRound}
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center gap-3 w-full mx-auto min-h-0 ${projectorMode ? 'max-w-4xl' : 'max-w-2xl'}`}>
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
          <div style={{ position: 'relative', width: '100%', height: sorted.length * ROW_HEIGHT }}>
            {sorted.map((team) => {
              const rank = currRank.get(team.id)!;
              const prevRankVal = prevRank.get(team.id) ?? rank;
              const delta = prevRankVal - rank;
              const top = (settled ? rank : prevRankVal) - 1;
              return (
                <div
                  key={team.id}
                  style={{
                    position: 'absolute', left: 0, right: 0, top: top * ROW_HEIGHT,
                    transition: 'top 1.4s cubic-bezier(0.4,0,0.2,1)',
                  }}
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
                </div>
              );
            })}
          </div>
        </div>

      </div>

        {!projectorMode && (
          <div className="w-full flex justify-center" style={{ padding: '14px 0 20px' }}>
            <button
              onClick={onContinue}
              className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
              style={{
                background: 'transparent',
                border: `2px solid ${theme.color1}`,
                color: theme.color1,
                boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}`,
              }}
            >
              Continue ▶
            </button>
          </div>
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
          className="w-full flex-1 flex flex-col items-center px-4"
        >
        <div className={`flex-1 flex flex-col items-center justify-center gap-4 w-full mx-auto min-h-0 ${projectorMode ? 'max-w-2xl' : 'max-w-lg'}`}>
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
        </div>
          {!projectorMode && (
            <div className="w-full flex justify-center" style={{ padding: '14px 0 20px' }}>
              <button
                onClick={() => onSetRevealStep?.(sorted.length >= 3 ? 1 : sorted.length === 2 ? 2 : 3)}
                className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
                style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
              >
                {sorted.length >= 3 ? "Reveal 3rd Place ▼" : "Reveal the Winner ▼"}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* STEP 1 - BRONZE */}
      {revealStep === 1 && bronze && (
        <motion.div key="bronze" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex-1 flex flex-col items-center px-4">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-0 relative overflow-hidden w-full">
          <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
            src="https://lottie.host/4a2e9b28-3d0e-4add-a001-09132066044b/RD46vGutJH.json"
            autoplay
            loop
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              filter: 'grayscale(1) sepia(1) hue-rotate(2deg) saturate(3.2) brightness(.9)',
              opacity: 0.85, pointerEvents: 'none',
            }}
          />
          <div
            className="font-bungee text-[12px] uppercase tracking-widest px-[18px] py-[7px] rounded-2xl absolute top-0 z-20"
            style={{ background: alpha(theme.color1, 0.22), border: `1px solid ${alpha(theme.color1, 0.45)}`, color: theme.color1 }}
          >
            Final Standings
          </div>
          <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
            src="/lottie/medal-3rd-bronze.json"
            autoplay
            loop
            style={{ width: projectorMode ? 190 : 140, height: projectorMode ? 190 : 140, position: 'relative', zIndex: 2 }}
          />
          <div className="flex flex-col items-center gap-2 relative z-10">
            <Emoji3D emoji={bronze.emoji} className={projectorMode ? 'w-14 h-14' : 'w-10 h-10'} />
            <span className={`font-extrabold ${projectorMode ? 'text-3xl' : 'text-xl'}`}>{bronze.name}</span>
            <span className={`font-extrabold ${projectorMode ? 'text-4xl' : 'text-2xl'}`} style={{ color: '#8866c2' }}>{bronze.score} pts</span>
          </div>
        </div>
          {!projectorMode && (
            <div className="w-full flex justify-center" style={{ padding: '14px 0 20px' }}>
              <button
                onClick={() => onSetRevealStep?.(2)}
                className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
                style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
              >
                Reveal 2nd Place ▼
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* STEP 2 - SILVER */}
      {revealStep === 2 && silver && (
        <motion.div key="silver" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex-1 flex flex-col items-center px-4">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-0 relative overflow-hidden w-full">
          <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
            src="https://lottie.host/4a2e9b28-3d0e-4add-a001-09132066044b/RD46vGutJH.json"
            autoplay
            loop
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              filter: 'grayscale(1) brightness(1.35) saturate(.12) contrast(1.05)',
              opacity: 0.85, pointerEvents: 'none',
            }}
          />
          <div
            className="font-bungee text-[12px] uppercase tracking-widest px-[18px] py-[7px] rounded-2xl absolute top-0 z-20"
            style={{ background: alpha(theme.color1, 0.22), border: `1px solid ${alpha(theme.color1, 0.45)}`, color: theme.color1 }}
          >
            Final Standings
          </div>
          <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
            src="/lottie/medal-2nd-silver.json"
            autoplay
            loop
            style={{ width: projectorMode ? 200 : 150, height: projectorMode ? 200 : 150, position: 'relative', zIndex: 2 }}
          />
          <div className="flex flex-col items-center gap-2 relative z-10">
            <Emoji3D emoji={silver.emoji} className={projectorMode ? 'w-16 h-16' : 'w-11 h-11'} />
            <span className={`font-extrabold ${projectorMode ? 'text-4xl' : 'text-2xl'}`}>{silver.name}</span>
            <span className={`font-extrabold ${projectorMode ? 'text-5xl' : 'text-[28px]'}`} style={{ color: '#8866c2' }}>{silver.score} pts</span>
          </div>
        </div>
          {!projectorMode && (
            <div className="w-full flex justify-center" style={{ padding: '14px 0 20px' }}>
              <button
                onClick={() => { playDrumroll(); setTimeout(() => onSetRevealStep?.(3), 1500); }}
                className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4"
                style={{ background: 'transparent', border: `2px solid ${theme.color1}`, color: theme.color1, boxShadow: `0 0 20px ${alpha(theme.color1, 0.3)}` }}
              >
                Reveal the Winner ▼
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* STEP 3 - GOLD */}
      {revealStep === 3 && gold && (
        <motion.div key="gold" initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex-1 flex flex-col items-center px-4 relative">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center min-h-0 relative overflow-hidden w-full">
          <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
            key={winnerConfettiPlays}
            src="https://lottie.host/79266ebc-8b4a-4b7c-a1a0-326ac1057a23/JU5NbpIPAL.lottie"
            autoplay
            style={{
              position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%',
              minWidth: '130vh', minHeight: '130vh', transform: 'translate(-50%,-50%) rotate(90deg)', zIndex: 1,
            }}
          />
          {!projectorMode && (
            <button
              onClick={() => onReplayWinnerConfetti?.()}
              title="Replay confetti"
              className="absolute top-0 right-0 rounded-full flex items-center justify-center z-20"
              style={{ width: 34, height: 34, background: 'rgba(230, 200, 90, 0.25)', border: '1px solid rgba(230, 200, 90, 0.6)', color: 'rgba(230, 200, 90, 1)', fontSize: 16 }}
            >
              🎉
            </button>
          )}
          <div
            className="font-bungee text-[12px] uppercase tracking-widest px-[18px] py-[7px] rounded-2xl absolute top-0 z-20"
            style={{ background: 'rgba(230, 200, 90, 0.25)', border: '1px solid rgba(230, 200, 90, 0.6)', color: 'rgba(230, 200, 90, 1)' }}
          >
            Final Standings
          </div>
          <div
            className="relative flex items-center justify-center z-10"
            style={{ width: projectorMode ? 260 : 190, height: projectorMode ? 260 : 190 }}
          >
            <DotLottieReact
              src="https://lottie.host/91eb187c-5571-4b33-9b94-4e5908bdf364/Dv3SH3T5y1.lottie"
              autoplay
              loop
              renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            />
            <Emoji3D emoji={gold.emoji} className={`relative z-10 ${projectorMode ? 'w-20 h-20' : 'w-14 h-14'}`} />
          </div>
          <div className="flex flex-col items-center gap-2.5 relative z-10">
            <span className={`font-extrabold ${projectorMode ? 'text-5xl' : 'text-3xl'}`}>{gold.name}</span>
            <span className={`font-extrabold ${projectorMode ? 'text-6xl' : 'text-4xl'}`} style={{ color: '#8866c2' }}>{gold.score} pts</span>
          </div>
        </div>
          {!projectorMode && (
            <div className="w-full flex justify-center" style={{ padding: '14px 0 20px' }}>
              <button
                onClick={() => onSetRevealStep?.(4)}
                className="font-bungee uppercase tracking-widest rounded-[10px] text-[14px] px-11 py-4 border-gold text-gold"
                style={{ background: 'transparent', borderWidth: 2, borderStyle: 'solid', boxShadow: `0 0 20px ${alpha(GOLD_COLORS[0], 0.3)}` }}
              >
                See Final Standings ▶
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* STEP 4 - COMBINED PODIUM */}
      {revealStep === 4 && gold && (
        <motion.div
          key="podium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex-1 flex flex-col items-center px-4 relative"
        >
        <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-2xl mx-auto min-h-0 relative overflow-hidden">
          {winnerConfettiPlays > 0 && (
            <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
              key={winnerConfettiPlays}
              src="https://lottie.host/79266ebc-8b4a-4b7c-a1a0-326ac1057a23/JU5NbpIPAL.lottie"
              autoplay
              style={{
                position: 'absolute', top: '50%', left: '50%', width: '100%', height: '100%',
                minWidth: '130vh', minHeight: '130vh', transform: 'translate(-50%,-50%) rotate(90deg)', zIndex: 1,
              }}
            />
          )}

          <div
            className="font-bungee text-[12px] uppercase tracking-widest px-5 py-2 rounded-full relative z-10"
            style={{ background: alpha(theme.color1, 0.15), border: `1px solid ${alpha(theme.color1, 0.4)}`, color: theme.color1 }}
          >
            Final Standings
          </div>

          <div className="flex items-end gap-3 mt-2 relative z-10">
            {silver && (
              <div className="flex flex-col items-center gap-1 w-28">
                <Emoji3D emoji={silver.emoji} className="w-8 h-8" />
                <span className="text-xs font-bold text-center truncate w-full">{silver.name}</span>
                <div className="w-full h-[76px] rounded-t-lg flex flex-col items-center justify-center gap-1" style={{ background: 'rgba(200,200,210,0.15)', border: '1.5px solid rgba(200,200,210,0.6)' }}>
                  <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
                    src="/lottie/crown.json"
                    autoplay
                    loop
                    style={{ width: 34, height: 34, filter: 'grayscale(1) brightness(1.3) sepia(.15) hue-rotate(180deg) saturate(.4)' }}
                  />
                  <span className="text-xs font-extrabold text-silver">{silver.score}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-1 w-32">
              <Emoji3D emoji={gold.emoji} className="w-10 h-10" />
              <span className="text-sm font-bold text-center truncate w-full">{gold.name}</span>
              <div className="w-full h-[104px] rounded-t-lg flex flex-col items-center justify-center gap-1.5" style={{ background: alpha(theme.color1, 0.25), border: `1.5px solid ${theme.color1}` }}>
                <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }} src="/lottie/crown.json" autoplay loop style={{ width: 44, height: 44 }} />
                <span className="text-sm font-extrabold text-gold">{gold.score}</span>
              </div>
            </div>
            {bronze && (
              <div className="flex flex-col items-center gap-1 w-28">
                <Emoji3D emoji={bronze.emoji} className="w-7 h-7" />
                <span className="text-xs font-bold text-center truncate w-full">{bronze.name}</span>
                <div className="w-full h-[60px] rounded-t-lg flex flex-col items-center justify-center gap-1" style={{ background: 'rgba(180,120,70,0.15)', border: '1.5px solid rgba(180,120,70,0.7)' }}>
                  <DotLottieReact renderConfig={{ devicePixelRatio: DPR, autoResize: true }}
                    src="/lottie/crown.json"
                    autoplay
                    loop
                    style={{ width: 28, height: 28, filter: 'sepia(1) saturate(2.2) hue-rotate(-25deg) brightness(.85)' }}
                  />
                  <span className="text-xs font-extrabold text-bronze">{bronze.score}</span>
                </div>
              </div>
            )}
          </div>

          {rest.length > 0 && (
            <div className="w-full max-w-md flex flex-col gap-1.5 relative z-10">
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
        </div>

          {!projectorMode && (
            <div className="w-full flex justify-center items-center gap-3" style={{ padding: '14px 0 20px' }}>
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
