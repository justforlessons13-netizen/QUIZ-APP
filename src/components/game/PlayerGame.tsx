import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Clock, Trophy, PartyPopper, Tv, XCircle, CheckCircle } from 'lucide-react';
import { LiveGameState, LiveTeam } from '@/types/live-game';
import { Question } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { DynamicBackground } from '@/components/layout/DynamicBackground';
import { getFirestore, doc, onSnapshot, runTransaction } from 'firebase/firestore';

import { GAME_RULES } from '@/components/host-game/GameRulesDisplay';

interface PlayerGameProps {
  sessionId: string;
  teamId: string;
  teamName: string;
}

export function PlayerGame({ sessionId, teamId, teamName }: PlayerGameProps) {
  const [game, setGame] = useState<LiveGameState | null>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [myWager, setMyWager] = useState(false);

  // ── Submission state ──────────────────────────────────────────────────────
  const [submitState, setSubmitState] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const submittedAnswerRef = useRef<string>('');
  const submitInFlight = useRef(false);

  const [lastQuestionIndex, setLastQuestionIndex] = useState(-1);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Local smooth timer
  const [displayTime, setDisplayTime] = useState(0);
  const timerActiveRef = useRef(false);
  const localTimeRef = useRef(0);

  // ── Subscribe to game state ───────────────────────────────────────────────
  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'games', sessionId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        setGame(docSnap.data() as LiveGameState);
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Timer: single interval, server syncs only when meaningfully off
  useEffect(() => {
    if (!game) return;

    const serverActive = game.timerActive;
    const serverTime = game.timeLeft;

    if (!serverActive) {
      timerActiveRef.current = false;
      localTimeRef.current = serverTime;
      setDisplayTime(serverTime);
      return;
    }

    if (!timerActiveRef.current) {
      timerActiveRef.current = true;
      localTimeRef.current = serverTime;
      setDisplayTime(serverTime);
    } else {
      const drift = localTimeRef.current - serverTime;
      if (Math.abs(drift) > 2) {
        localTimeRef.current = serverTime;
        setDisplayTime(serverTime);
      }
    }
  }, [game?.timerActive, game?.timeLeft]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!timerActiveRef.current) return;
      localTimeRef.current = Math.max(0, localTimeRef.current - 1);
      setDisplayTime(localTimeRef.current);
      if (localTimeRef.current <= 0) {
        timerActiveRef.current = false;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Anti-cheat: tab-switch detection ─────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === 'hidden' &&
        game?.phase === 'question' &&
        submitState === 'idle'
      ) {
        const db = getFirestore();
        const gameRef = doc(db, 'games', sessionId);
        try {
          await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) return;
            const data = gameDoc.data() as LiveGameState;
            const roundIdx = data.rounds.findIndex(
              r => r.questionIndex === data.currentQuestionIndex
            );
            if (roundIdx === -1) return;
            const newRounds = [...data.rounds];
            const round = { ...newRounds[roundIdx] };
            const exists = round.answers.some(a => a.teamId === teamId);
            round.answers = exists
              ? round.answers.map(a =>
                a.teamId === teamId
                  ? { ...a, hasCheated: true, isCorrect: false, pointsAwarded: 0 }
                  : a
              )
              : [
                ...round.answers,
                { teamId, answer: '', hasCheated: true, isCorrect: false, isWagered: false, pointsAwarded: 0 },
              ];
            newRounds[roundIdx] = round;
            transaction.update(gameRef, { rounds: newRounds });
          });
          setSubmitState('confirmed');
        } catch (err) {
          console.error('Anti-cheat flag failed:', err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [game?.phase, game?.currentQuestionIndex, sessionId, teamId, submitState]);

  // ── Reset when question changes ───────────────────────────────────────────
  useEffect(() => {
    if (!game) return;
    if (game.currentQuestionIndex !== lastQuestionIndex) {
      setMyAnswer('');
      setMyWager(false);
      setSubmitState('idle');
      submittedAnswerRef.current = '';
      submitInFlight.current = false;
      setLightboxOpen(false);
      setLastQuestionIndex(game.currentQuestionIndex);
    }
  }, [game?.currentQuestionIndex, lastQuestionIndex]);

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    if (!game || !myAnswer.trim()) return;
    if (submitInFlight.current) return;
    if (submitState !== 'idle') return;

    submitInFlight.current = true;
    setSubmitState('pending');
    submittedAnswerRef.current = myAnswer.trim();

    const db = getFirestore();
    const gameRef = doc(db, 'games', sessionId);

    try {
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error('Game not found');

        const data = gameDoc.data() as LiveGameState;
        const roundIdx = data.rounds.findIndex(
          (r) => r.questionIndex === data.currentQuestionIndex
        );
        if (roundIdx === -1) throw new Error('Round not found');

        const newRounds = [...data.rounds];
        const round = { ...newRounds[roundIdx] };
        const exists = round.answers.some((a) => a.teamId === teamId);

        round.answers = exists
          ? round.answers.map((a) =>
            a.teamId === teamId
              ? { ...a, answer: myAnswer.trim(), isWagered: myWager }
              : a
          )
          : [
            ...round.answers,
            {
              teamId,
              answer: myAnswer.trim(),
              isCorrect: null,
              isWagered: myWager,
              pointsAwarded: 0,
            },
          ];

        newRounds[roundIdx] = round;
        transaction.update(gameRef, { rounds: newRounds });
      });

      setSubmitState('confirmed');
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitState('failed');
      submitInFlight.current = false;
    }
  }, [game, myAnswer, myWager, sessionId, teamId, submitState]);

  const retrySubmit = () => {
    setSubmitState('idle');
    submitInFlight.current = false;
  };

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting to game...</p>
      </div>
    );
  }

  const myTeam = game.teams.find(t => t.id === teamId);
  const currentQuestion = game.questions[game.currentQuestionIndex];
  const isFinalRound = currentQuestion?.round === 6;
  const isMCQ = currentQuestion?.type === 'mcq' && isFinalRound;
  const isSubmitted = submitState === 'confirmed' || submitState === 'pending';

  // ── Team Setup Phase — IMPROVED ───────────────────────────────────────────
  if (game.phase === 'team-setup') {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-6 md:p-8 h-full relative overflow-hidden">
        {/* Centered content with orbit animation */}
        <div className="flex flex-col items-center justify-center gap-5 w-full max-w-md mx-auto">

          {/* Orbit rings around team emoji */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center mb-2">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border border-primary/10 animate-[spin_8s_linear_infinite]" />
            {/* Middle ring */}
            <div className="absolute inset-4 rounded-full border border-primary/15 animate-[spin_6s_linear_infinite_reverse]" />
            {/* Inner ring */}
            <div className="absolute inset-8 rounded-full border border-primary/20 animate-[spin_4s_linear_infinite]" />

            {/* Center emoji */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="relative z-10 text-6xl md:text-7xl filter drop-shadow-[0_0_20px_rgba(0,212,255,0.3)]"
            >
              {myTeam?.emoji || '🎮'}
            </motion.div>

            {/* Orbiting dots */}
            <div className="absolute inset-0 animate-[spin_12s_linear_infinite]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60 shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
            </div>
            <div className="absolute inset-2 animate-[spin_10s_linear_infinite_reverse]">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent/60 shadow-[0_0_6px_rgba(255,107,157,0.5)]" />
            </div>
          </div>

          {/* Team name */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bungee text-white tracking-wide drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
              Team {teamName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {game.teams.length} {game.teams.length === 1 ? 'team' : 'teams'} in lobby
            </p>
          </div>

          {/* Mini team list */}
          {game.teams.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 max-w-xs mb-4">
              {game.teams.slice(0, 6).map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border ${t.id === teamId
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : 'bg-card border-border text-muted-foreground'
                    }`}
                >
                  <span className="text-sm">{t.emoji}</span>
                  {t.id === teamId && <span className="font-semibold pr-0.5">You</span>}
                </div>
              ))}
              {game.teams.length > 6 && (
                <div className="flex items-center px-2.5 py-1.5 rounded-full text-xs bg-card border-border text-muted-foreground font-semibold">
                  +{game.teams.length - 6}
                </div>
              )}
            </div>
          )}

          {/* Pulsing dots */}
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/30 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1.4s' }}
              />
            ))}
          </div>

          {/* Waiting message */}
          <div className="text-center mt-2">
            <p className="font-bungee text-sm md:text-base text-primary tracking-[0.15em]">
              Waiting for Host
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Game will begin automatically
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (game.phase === 'game-rules') {
    const currentRuleIndex = game.currentRuleIndex || 0;
    const currentRule = GAME_RULES[currentRuleIndex] || GAME_RULES[0];

    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-4 md:p-8 h-full relative overflow-hidden">
        <motion.div
          key={currentRuleIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-[480px] mx-auto flex flex-col items-center"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bungee text-primary tracking-wide drop-shadow-[0_0_15px_rgba(0,255,255,0.4)]">
              Game Rules
            </h1>
          </div>

          <div className="w-full bg-card rounded-[14px] p-6 text-center relative shadow-lg" style={{ border: '1px solid rgba(173,187,255,0.09)' }}>
            <div className="flex flex-col items-center gap-3">
              <span style={{ fontSize: '32px', lineHeight: 1 }}>
                {currentRule.emoji}
              </span>
              <h3 className="font-bungee text-[#adbbff] tracking-wide text-[14px] md:text-[15px]">
                {currentRule.title}
              </h3>
              <p className="tracking-wide text-[11px] md:text-[12px]" style={{ color: 'rgba(173,187,255,0.45)' }}>
                {currentRule.description}
              </p>
            </div>
          </div>

          <div className="mt-6 text-[11px] font-bungee tracking-widest text-muted-foreground opacity-60">
            Rule {currentRuleIndex + 1} of {GAME_RULES.length}
          </div>

          <div className="flex gap-2 justify-center mt-3">
            {GAME_RULES.map((_, idx) => {
              const isActive = idx === currentRuleIndex;
              const isSeen = idx < currentRuleIndex;
              return (
                <motion.div
                  key={idx}
                  animate={{ scale: isActive ? 1.2 : 1 }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isActive ? 'bg-primary shadow-[0_0_8px_rgba(0,255,255,0.8)]' : ''}`}
                  style={{
                    backgroundColor: isActive ? undefined : isSeen ? 'rgba(173,187,255,0.35)' : 'rgba(173,187,255,0.15)'
                  }}
                />
              );
            })}
          </div>

          <div className="mt-8 text-[10px] font-bungee tracking-widest text-muted-foreground opacity-40 uppercase">
            Follow along on the main screen
          </div>
        </motion.div>
      </div>
    );
  }

  if (game.phase === 'round-rules') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 p-8 text-center"
      >
        <h2 className="text-4xl font-bold text-primary">Round {game.currentRound}</h2>
        <p className="text-muted-foreground">Look at the screen for rules!</p>
      </motion.div>
    );
  }

  // ── Question phase ────────────────────────────────────────────────────────
  if (game.phase === 'question') {
    if (!currentQuestion) return null;
    const isTimeUp = displayTime === 0;
    const timerPct = Math.max(0, Math.min(1, displayTime / (currentQuestion.timeLimit || 45)));
    const dash = 132 - 132 * timerPct;

    return (
      <motion.div
        key={`q-${game.currentQuestionIndex}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 w-full flex flex-col min-h-0"
      >
        {/* Fixed top row */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 md:px-10 pt-2">
          <div className="relative w-[50px] h-[50px] flex items-center justify-center flex-shrink-0">
            <svg width="50" height="50" viewBox="0 0 50 50" className="absolute top-0 left-0 -rotate-90">
              <circle cx="25" cy="25" r="21" fill="none" stroke="hsl(var(--foreground) / 0.12)" strokeWidth="4" />
              <circle cx="25" cy="25" r="21" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray="132" strokeDashoffset={dash} />
            </svg>
            <span className="font-bungee text-white text-sm">{displayTime}</span>
          </div>
          <span className="bg-primary/15 border border-primary/30 text-primary font-bungee text-[11px] tracking-wide uppercase px-4 py-2 rounded-2xl">
            {currentQuestion.category || `Round ${currentQuestion.round}`}
          </span>
          <span className="bg-card border border-border text-foreground font-bungee text-[11px] px-3.5 py-2 rounded-2xl flex-shrink-0">
            Round {currentQuestion.round}
          </span>
        </div>

        {/* Scrollable middle */}
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 md:px-10 py-6 overflow-auto min-h-0 max-w-2xl mx-auto w-full">
          <h2 className="text-lg md:text-xl font-bold text-center leading-tight text-foreground max-w-xl">
            {currentQuestion.text}
          </h2>

          {/* Media */}
          {currentQuestion.mediaUrl && (() => {
            const mUrl = currentQuestion.mediaUrl.toLowerCase();
            const mIsAudio = mUrl.includes('.mp3') || mUrl.includes('.wav') || mUrl.includes('.m4a') || mUrl.includes('.ogg');
            const mIsVideo = mUrl.includes('.mp4') || mUrl.includes('.webm') || mUrl.includes('.mov');
            const mIsImage = !mIsAudio && !mIsVideo;
            if (mIsAudio) return null;
            const isRevealed = game.timerActive || displayTime < game.timeLeft;
            return (
              <>
                {mIsImage && (
                  <>
                    <button
                      onClick={() => isRevealed && setLightboxOpen(true)}
                      className={`w-full rounded-xl overflow-hidden border border-border/50 bg-black/10 focus:outline-none transition-all ${isRevealed ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <div className="relative">
                        <img
                          src={currentQuestion.mediaUrl}
                          alt="Question media"
                          className={`w-full max-h-56 object-contain transition-all duration-700 ${isRevealed ? '' : 'blur-xl grayscale opacity-40'}`}
                        />
                        {!isRevealed && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-bungee text-[#adbbff] uppercase text-sm tracking-widest opacity-80">
                              Waiting...
                            </span>
                          </div>
                        )}
                      </div>
                      {isRevealed && (
                        <p className="text-[10px] text-muted-foreground/60 text-center pb-1.5 font-sugo tracking-widest uppercase">
                          Tap to enlarge
                        </p>
                      )}
                    </button>
                    {lightboxOpen && isRevealed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setLightboxOpen(false)}
                      >
                        <motion.img
                          initial={{ scale: 0.85 }}
                          animate={{ scale: 1 }}
                          src={currentQuestion.mediaUrl}
                          alt="Question media enlarged"
                          className="max-w-full max-h-full object-contain rounded-lg"
                          onClick={e => e.stopPropagation()}
                        />
                        <button
                          onClick={() => setLightboxOpen(false)}
                          className="absolute top-4 right-4 text-white/70 hover:text-white font-bungee text-sm bg-black/50 px-3 py-1.5 rounded-lg"
                        >
                          \u2715 Close
                        </button>
                      </motion.div>
                    )}
                  </>
                )}
                {mIsVideo && (
                  <div className="w-full rounded-xl overflow-hidden border border-border/50 bg-black/10 relative transition-all duration-700">
                    <video
                      src={currentQuestion.mediaUrl}
                      controls={isRevealed}
                      playsInline
                      className={`w-full max-h-56 object-contain transition-all duration-700 ${isRevealed ? '' : 'blur-xl grayscale opacity-40'}`}
                    />
                    {!isRevealed && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="font-bungee text-[#adbbff] uppercase text-sm tracking-widest opacity-80">
                          Waiting...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          {isTimeUp && submitState === 'idle' && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-bold w-full text-center">
              Time's Up! \uD83D\uDED1
            </div>
          )}

          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div key="submitted" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 p-6 rounded-xl w-full max-w-md"
                style={{ background: submitState === 'pending' ? 'hsl(var(--primary) / 0.06)' : 'hsl(var(--primary) / 0.10)', border: `1px solid hsl(var(--primary) / ${submitState === 'pending' ? '0.15' : '0.25'})` }}>
                {submitState === 'pending' ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <CheckCircle2 className="w-10 h-10 text-primary" />}
                <p className="font-bold text-primary">{submitState === 'pending' ? 'Locking in...' : 'Answer Locked In!'}</p>
                <p className="text-sm text-muted-foreground">"{submittedAnswerRef.current}"</p>
                {myWager && <span className="text-xs text-accent">\u26A1 Go Hard wagered</span>}
              </motion.div>
            ) : submitState === 'failed' ? (
              <motion.div key="failed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 p-5 rounded-xl bg-destructive/10 border border-destructive/20 w-full max-w-md text-center">
                <p className="font-bold text-destructive text-sm">Submission failed \u2014 tap to retry</p>
                <Button size="sm" variant="destructive" onClick={retrySubmit} className="rounded-xl">Try Again</Button>
              </motion.div>
            ) : (
              <motion.div key="input" className="w-full max-w-md flex flex-col gap-4">
                {isMCQ ? (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {currentQuestion.options?.map(option => (
                      <button key={option} onClick={() => setMyAnswer(option)} disabled={isTimeUp}
                        className={`p-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${myAnswer === option ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card hover:border-primary/40 text-card-foreground'} ${isTimeUp ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input type="text" value={myAnswer} onChange={e => setMyAnswer(e.target.value)}
                    placeholder={isTimeUp ? "Too late!" : "Type your answer..."} disabled={isTimeUp}
                    className={`w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg ${isTimeUp ? 'opacity-50 cursor-not-allowed' : ''}`}
                    autoFocus onKeyDown={e => e.key === 'Enter' && myAnswer.trim() && !isTimeUp && submitAnswer()} />
                )}

                {isFinalRound && (
                  <div className={`flex items-center gap-4 p-4 w-full rounded-xl border transition-all ${myWager ? 'bg-accent/10 border-accent/30' : 'bg-card border-border'}`}>
                    <button onClick={() => !isTimeUp && setMyWager(!myWager)} disabled={isTimeUp}
                      className={`relative w-14 h-8 rounded-full transition-all ${myWager ? 'bg-accent' : 'bg-muted'} ${isTimeUp ? 'opacity-50' : ''}`}>
                      <span className={`absolute w-6 h-6 rounded-full bg-foreground top-1 transition-all ${myWager ? 'left-7' : 'left-1'}`} />
                    </button>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${myWager ? 'text-accent' : 'text-muted-foreground'}`}>Go Hard {myWager ? '\u26A1' : ''}</p>
                      <p className="text-xs text-muted-foreground">{myWager ? 'Correct = +2 \u00B7 Wrong = \u22122' : 'Safe play: +1 or 0'}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pinned footer */}
        {!isSubmitted && submitState !== 'failed' && (
          <div className="flex-shrink-0 flex justify-center border-t border-border/50 py-4">
            <Button onClick={submitAnswer} disabled={!myAnswer.trim() || isTimeUp}
              className="w-full max-w-md py-3 h-auto text-base font-bold rounded-xl">
              Lock In Answer
            </Button>
          </div>
        )}
      </motion.div>
    );
  }

  // Grading
  if (game.phase === 'grading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 p-8 text-center"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <h2 className="text-xl font-bold text-foreground">Grading in progress...</h2>
        <p className="text-muted-foreground text-sm">
          The host is checking answers for Round {game.currentRound}
        </p>
      </motion.div>
    );
  }

  // Reveal Phase
  if (game.phase === 'reveal') {
    const startIndexOfRound = game.questions.findIndex(q => q.round === game.currentRound);
    const roundQuestions = game.questions.filter(q => q.round === game.currentRound);
    let roundTotalPoints = 0;

    return (
      <motion.div
        key={`recap-${game.currentRound}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 h-full"
      >
        <div className="text-center">
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider mb-2 inline-block">
            Round {game.currentRound} Recap
          </span>
          <h2 className="text-2xl font-bold text-foreground">Your Results</h2>
        </div>

        <div className="w-full space-y-3 overflow-y-auto max-h-[60vh] pb-4">
          {roundQuestions.map((q, i) => {
            const globalIndex = startIndexOfRound + i;
            const roundState = game.rounds.find(r => r.questionIndex === globalIndex);
            const myAns = roundState?.answers.find(a => a.teamId === teamId);
            if (!myAns) return null;
            roundTotalPoints += myAns.pointsAwarded;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-xl border bg-card/50 ${myAns.hasCheated
                  ? 'border-red-500/50 bg-red-500/5'
                  : myAns.isCorrect
                    ? 'border-success/30'
                    : 'border-destructive/30'
                  }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Question {i + 1}</p>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {myAns.hasCheated ? (
                        <span className="flex items-center gap-1.5 bg-red-600 text-white font-bungee text-[10px] px-2 py-0.5 rounded animate-pulse">
                          <XCircle className="w-3 h-3" />
                          BANNED / CHEATED
                        </span>
                      ) : (
                        <>
                          {myAns.isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className={`text-sm font-bold ${myAns.isCorrect ? 'text-success' : 'text-destructive'}`}>
                            {myAns.answer || '(no answer)'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${myAns.hasCheated
                      ? 'border-red-500/30 bg-red-500/10'
                      : myAns.pointsAwarded > 0
                        ? 'bg-success/10 border-success/30'
                        : 'bg-card border-border'
                      }`}
                  >
                    <span
                      className={`text-lg font-bold ${myAns.hasCheated
                        ? 'text-red-500'
                        : myAns.pointsAwarded > 0
                          ? 'text-success'
                          : 'text-muted-foreground'
                        }`}
                    >
                      {myAns.pointsAwarded > 0 ? '+' : ''}{myAns.pointsAwarded}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="w-full p-4 rounded-xl bg-primary/10 border border-primary/20 flex justify-between items-center">
          <span className="font-bold text-primary">Round Total</span>
          <span className="text-2xl font-black text-primary text-glow-primary">
            {roundTotalPoints > 0 ? '+' : ''}{roundTotalPoints} pts
          </span>
        </div>
        <p className="text-xs text-muted-foreground animate-pulse">Waiting for leaderboard...</p>
      </motion.div>
    );
  }

  // Final Reveal
  if (game.phase === 'final-reveal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center px-6"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          <Tv className="w-24 h-24 text-primary relative z-10" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">Eyes on the Screen!</h2>
        <p className="text-lg text-muted-foreground">The winner is being revealed...</p>
        <div className="p-4 rounded-xl bg-card border border-border mt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Your Final Score</p>
          <p className="text-4xl font-bold text-foreground">{myTeam?.score ?? 0}</p>
        </div>
      </motion.div>
    );
  }

  // Leaderboard
  if (game.phase === 'leaderboard') {
    const sorted = [...game.teams].sort((a, b) => b.score - a.score);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 w-full flex flex-col">
        <div className="flex-shrink-0 flex justify-center pt-2">
          <span className="bg-primary/15 border border-primary/30 text-primary font-bungee text-[11px] tracking-wide uppercase px-4 py-2 rounded-2xl">
            Standings after Round {game.currentRound}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 max-w-md mx-auto w-full">
          {sorted.slice(0, 5).map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className={"w-full flex items-center gap-3 p-3 rounded-xl border " + (team.id === teamId ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
              <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
              <Emoji3D emoji={team.emoji} className="w-6 h-6" />
              <span className={"flex-1 font-medium " + (team.id === teamId ? 'text-primary' : 'text-foreground')}>{team.name}</span>
              <span className="font-bold text-foreground">{team.score}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex-shrink-0 py-4 text-center">
          <p className="text-xs text-muted-foreground">Waiting for host to continue...</p>
        </div>
      </motion.div>
    );
  }

  // Finished
  if (game.phase === 'finished') {
    const sorted = [...game.teams].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      for (let i = b.roundScores.length - 1; i >= 0; i--) {
        const diff = (b.roundScores[i] || 0) - (a.roundScores[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    const myRank = sorted.findIndex(t => t.id === teamId) + 1;
    const isWinner = myRank === 1;
    const totalTeams = game.teams.length;
    const revealStep = game.revealStep || 0; // 0=none,1=bronze,2=silver,3=gold revealed
    const isTopThree = myRank > 0 && myRank <= 3;
    const myThreshold = myRank === 3 ? 1 : myRank === 2 ? 2 : myRank === 1 ? 3 : 99;
    const myPositionRevealed = revealStep >= myThreshold;
  
    // Non-top-3 finishers: no suspense needed, ranks 1-3 are excluded until the host reveals them anyway.
    if (!isTopThree) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 w-full flex flex-col items-center justify-center gap-6 p-8 text-center">
          <Trophy className="w-16 h-16 text-primary/50" />
          <h2 className="text-4xl font-bold text-foreground">Game Over</h2>
          <p className="text-muted-foreground text-lg">Well played, {teamName}.</p>
          <div className="w-full max-w-xs bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Final Position</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-6xl font-black text-foreground">#{myRank}</span>
                <span className="text-xl text-muted-foreground font-medium">/ {totalTeams}</span>
              </div>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Final Score</p>
              <p className="text-3xl font-bold text-primary">{myTeam?.score ?? 0} <span className="text-base font-normal text-muted-foreground">pts</span></p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground/60 italic mt-4">Better luck next time! 🍀</p>
        </motion.div>
      );
    }
  
    // Top-3: gated reveal, waiting for the host's revealStep to reach your threshold.
    if (!myPositionRevealed) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 w-full flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-3xl">🔒</div>
          <h2 className="text-2xl font-bold text-foreground">You made the top 3!</h2>
          <p className="text-muted-foreground max-w-xs">Your exact placement will be revealed when the host gets to it on the big screen.</p>
          <p className="text-xs font-bungee uppercase tracking-widest text-primary/70">Eyes on the screen</p>
        </motion.div>
      );
    }
  
    return (
      <motion.div key={game.winnerConfettiPlays} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 w-full flex flex-col items-center justify-center gap-6 p-8 text-center">
        {isWinner ? (
          <div className="relative">
            <PartyPopper className="w-20 h-20 text-gold animate-bounce" />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 text-4xl">👑</motion.div>
          </div>
        ) : (
          <Trophy className="w-16 h-16 text-primary/50" />
        )}
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-foreground">{isWinner ? 'CHAMPION!' : 'Game Over'}</h2>
          <p className="text-muted-foreground text-lg">{isWinner ? 'You conquered the quiz!' : ('Well played, ' + teamName + '.')}</p>
        </div>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="w-full max-w-xs bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Final Position</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className={"text-6xl font-black " + (isWinner ? 'text-gold text-glow-gold' : 'text-foreground')}>#{myRank}</span>
              <span className="text-xl text-muted-foreground font-medium">/ {totalTeams}</span>
            </div>
          </div>
          <div className="w-full h-px bg-border/50" />
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Final Score</p>
            <p className="text-3xl font-bold text-primary">{myTeam?.score ?? 0} <span className="text-base font-normal text-muted-foreground">pts</span></p>
          </div>
        </motion.div>
        {!isWinner && <p className="text-sm text-muted-foreground/60 italic mt-4">Better luck next time! 🍀</p>}
      </motion.div>
    );
  }

  if (game.phase === 'round-scores-adjustment') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-8 text-center h-[80vh] justify-center"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <h2 className="text-2xl font-bold text-foreground">Score Verification</h2>
        <p className="text-muted-foreground">
          The host is finalizing scores for Round {game.currentRound}...
        </p>
      </motion.div>
    );
  }

  if (game.phase === 'final-standings') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-8 text-center h-[80vh] justify-center"
      >
        <Trophy className="w-16 h-16 text-primary mb-2 animate-bounce" />
        <h2 className="text-2xl font-bold text-foreground">View the Big Screen!</h2>
        <p className="text-muted-foreground">The final standings are being displayed.</p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-muted-foreground">Waiting for host...</p>
    </div>
  );
}