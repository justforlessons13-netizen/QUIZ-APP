import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Clock, Trophy, PartyPopper, Tv, XCircle, CheckCircle } from 'lucide-react';
import { LiveGameState, LiveTeam } from '@/types/live-game';
import { Question } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { getFirestore, doc, onSnapshot, updateDoc, runTransaction } from 'firebase/firestore';

interface PlayerGameProps {
  sessionId: string;
  teamId: string;
  teamName: string;
}

export function PlayerGame({ sessionId, teamId, teamName }: PlayerGameProps) {
  const [game, setGame] = useState<LiveGameState | null>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [myWager, setMyWager] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastQuestionIndex, setLastQuestionIndex] = useState(-1);

  // NEW: Local state for smooth timer
  const [displayTime, setDisplayTime] = useState(0);

  // Subscribe to game state from Firestore
  useEffect(() => {
    const db = getFirestore();
    const gameRef = doc(db, 'games', sessionId);
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as LiveGameState;
        setGame(data);
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // NEW: Sync local timer with server, but run it locally for smoothness
  useEffect(() => {
    if (game) {
      // Always sync with the authoritative server time when it arrives
      setDisplayTime(game.timeLeft);
    }
  }, [game?.timeLeft]);

  // NEW: Local countdown interval
  useEffect(() => {
    // Only tick if timer is active and we have time left
    if (!game?.timerActive || displayTime <= 0) return;

    const timer = setInterval(() => {
      setDisplayTime((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [game?.timerActive]); // We don't depend on displayTime here to avoid interval resets

  // ANTI-CHEAT: Detect if player leaves the tab during the question phase
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Trigger only if tab is hidden during a question and they haven't submitted yet
      if (document.visibilityState === 'hidden' && game?.phase === 'question' && !submitted) {
        const db = getFirestore();
        const gameRef = doc(db, 'games', sessionId);

        try {
          await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) return;

            const data = gameDoc.data() as LiveGameState;
            const currentRoundIndex = data.rounds.findIndex(r => r.questionIndex === data.currentQuestionIndex);
            if (currentRoundIndex === -1) return;

            const newRounds = [...data.rounds];
            const currentRound = { ...newRounds[currentRoundIndex] };

            const teamAnswerExists = currentRound.answers.some(a => a.teamId === teamId);
            let newAnswers;
            if (teamAnswerExists) {
              newAnswers = currentRound.answers.map(a =>
                a.teamId === teamId
                  ? { ...a, hasCheated: true, isCorrect: false, pointsAwarded: 0 }
                  : a
              );
            } else {
              newAnswers = [
                ...currentRound.answers,
                { teamId, answer: '', hasCheated: true, isCorrect: false, isWagered: false, pointsAwarded: 0 }
              ];
            }

            currentRound.answers = newAnswers;
            newRounds[currentRoundIndex] = currentRound;

            transaction.update(gameRef, { rounds: newRounds });
          });
          
          setSubmitted(true);
        } catch (err) {
          console.error("Anti-cheat flag failed:", err);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [game?.phase, game?.currentQuestionIndex, sessionId, teamId, submitted]);

  // Reset answer state when question changes
  useEffect(() => {
    if (game && game.currentQuestionIndex !== lastQuestionIndex) {
      setMyAnswer('');
      setMyWager(false);
      setSubmitted(false);
      setLastQuestionIndex(game.currentQuestionIndex);
    }
  }, [game?.currentQuestionIndex, lastQuestionIndex]);

  const submitAnswer = useCallback(async () => {
    if (!game || !myAnswer.trim()) return;
    const db = getFirestore();
    const gameRef = doc(db, 'games', sessionId);

    try {
      await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) return;

        const data = gameDoc.data() as LiveGameState;
        const currentRoundIndex = data.rounds.findIndex(r => r.questionIndex === data.currentQuestionIndex);
        if (currentRoundIndex === -1) return;

        const newRounds = [...data.rounds];
        const currentRound = { ...newRounds[currentRoundIndex] };

        const teamAnswerExists = currentRound.answers.some(a => a.teamId === teamId);
        let newAnswers;
        if (teamAnswerExists) {
          newAnswers = currentRound.answers.map(a =>
            a.teamId === teamId ? { ...a, answer: myAnswer.trim(), isWagered: myWager } : a
          );
        } else {
          newAnswers = [
            ...currentRound.answers,
            { teamId, answer: myAnswer.trim(), isCorrect: null, isWagered: myWager, pointsAwarded: 0 }
          ];
        }

        currentRound.answers = newAnswers;
        newRounds[currentRoundIndex] = currentRound;

        transaction.update(gameRef, { rounds: newRounds });
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit answer: ", err);
    }
  }, [game, teamId, myAnswer, myWager, sessionId]);


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

  // Waiting for game to start
  if (game.phase === 'team-setup' || game.phase === 'game-rules') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 p-8 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-6xl"
        >
          {myTeam?.emoji ? <Emoji3D emoji={myTeam.emoji} className="w-8 h-8" /> : '🎮'}
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground">{teamName}</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Waiting for host to start...</span>
        </div>
        <p className="text-sm text-muted-foreground/60">Get ready! 🧠</p>
      </motion.div>
    );
  }

  // Round Rules (Wait screen)
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

  // Question phase — show question and accept answers
  if (game.phase === 'question') {
    if (!currentQuestion) return null;

    // UPDATED: Use local displayTime for "Time's Up" logic
    const isTimeUp = displayTime === 0;

    return (
      <motion.div
        key={`q-${game.currentQuestionIndex}`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto px-4"
      >
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-sm font-semibold border border-primary/20">
            Round {currentQuestion.round}
          </span>
          <span className="text-muted-foreground text-sm">{currentQuestion.category}</span>
        </div>

        {game.phase === 'question' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            {/* UPDATED: Show local smooth timer */}
            <span className="text-2xl font-mono font-bold text-foreground">{displayTime}s</span>
          </div>
        )}

        <h2 className="text-xl md:text-2xl font-bold text-center leading-tight text-foreground">
          {currentQuestion.text}
        </h2>

        {/* Time's Up Message */}
        {isTimeUp && !submitted && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-bold w-full text-center">
            Time's Up! 🛑
          </div>
        )}

        {submitted ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 p-6 rounded-xl bg-primary/10 border border-primary/20 w-full"
          >
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <p className="font-bold text-primary">Answer Locked In!</p>
            <p className="text-sm text-muted-foreground">"{myAnswer}"</p>
            {myWager && <span className="text-xs text-accent">⚡ Go Hard wagered</span>}
          </motion.div>
        ) : (
          <>
            {isMCQ ? (
              <div className="grid grid-cols-2 gap-3 w-full">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMyAnswer(option)}
                    disabled={isTimeUp}
                    className={`p-4 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${myAnswer === option
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border bg-card hover:border-primary/40 text-card-foreground'
                      } ${isTimeUp ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                placeholder={isTimeUp ? "Too late!" : "Type your answer..."}
                disabled={isTimeUp}
                className={`w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-center text-lg ${isTimeUp ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && myAnswer.trim() && !isTimeUp && submitAnswer()}
              />
            )}

            {isFinalRound && (
              <div
                className={`flex items-center gap-4 p-4 w-full rounded-xl border transition-all ${myWager ? 'bg-accent/10 border-accent/30' : 'bg-card border-border'
                  }`}
              >
                <button
                  onClick={() => !isTimeUp && setMyWager(!myWager)}
                  disabled={isTimeUp}
                  className={`relative w-14 h-8 rounded-full transition-all ${myWager ? 'bg-accent' : 'bg-muted'} ${isTimeUp ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute w-6 h-6 rounded-full bg-foreground top-1 transition-all ${myWager ? 'left-7' : 'left-1'}`} />
                </button>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${myWager ? 'text-accent' : 'text-muted-foreground'}`}>
                    Go Hard {myWager ? '⚡' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {myWager ? 'Correct = +2 · Wrong = −2' : 'Safe play: +1 or 0'}
                  </p>
                </div>
              </div>
            )}

            <Button
              onClick={submitAnswer}
              disabled={!myAnswer.trim() || isTimeUp}
              className="w-full py-3 h-auto text-base font-bold rounded-xl"
            >
              Lock In Answer
            </Button>
          </>
        )}
      </motion.div>
    );
  }

  // Grading phase — waiting
  if (game.phase === 'grading') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 p-8 text-center"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <h2 className="text-xl font-bold text-foreground">Grading in progress...</h2>
        <p className="text-muted-foreground text-sm">The host is checking answers for Round {game.currentRound}</p>
      </motion.div>
    );
  }

  // Reveal Phase - ROUND RECAP
  if (game.phase === 'reveal') {
    // 1. Find all questions in this round
    const startIndexOfRound = game.questions.findIndex(q => q.round === game.currentRound);
    const roundQuestions = game.questions.filter(q => q.round === game.currentRound);

    // Calculate total points for this round
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

        {/* Scrollable List of Results */}
        <div className="w-full space-y-3 overflow-y-auto max-h-[60vh] pb-4">
          {roundQuestions.map((q, i) => {
            const globalIndex = startIndexOfRound + i;
            const roundState = game.rounds.find(r => r.questionIndex === globalIndex);
            const myAnswer = roundState?.answers.find(a => a.teamId === teamId);

            if (!myAnswer) return null;
            roundTotalPoints += myAnswer.pointsAwarded;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-xl border bg-card/50 ${myAnswer.hasCheated ? 'border-red-500/50 bg-red-500/5' :
                    myAnswer.isCorrect ? 'border-success/30' : 'border-destructive/30'
                  }`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase">Question {i + 1}</p>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.text}</p>

                    <div className="flex items-center gap-2 mt-2">
                      {/* Show BANNED badge if they cheated */}
                      {myAnswer.hasCheated ? (
                        <span className="flex items-center gap-1.5 bg-red-600 text-white font-bungee text-[10px] px-2 py-0.5 rounded animate-pulse">
                          <XCircle className="w-3 h-3" />
                          BANNED / CHEATED
                        </span>
                      ) : (
                        <>
                          {myAnswer.isCorrect ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span className={`text-sm font-bold ${myAnswer.isCorrect ? 'text-success' : 'text-destructive'}`}>
                            {myAnswer.answer || '(no answer)'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score Circle - will show 0 automatically because of useLiveGame.ts update */}
                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${myAnswer.hasCheated ? 'border-red-500/30 bg-red-500/10' :
                      myAnswer.pointsAwarded > 0 ? 'bg-success/10 border-success/30' : 'bg-card border-border'
                    }`}>
                    <span className={`text-lg font-bold ${myAnswer.hasCheated ? 'text-red-500' :
                        myAnswer.pointsAwarded > 0 ? 'text-success' : 'text-muted-foreground'
                      }`}>
                      {myAnswer.pointsAwarded > 0 ? '+' : ''}{myAnswer.pointsAwarded}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total Score Footer */}
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
        <p className="text-lg text-muted-foreground">
          The winner is being revealed...
        </p>
        <div className="p-4 rounded-xl bg-card border border-border mt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Your Final Score</p>
          <p className="text-4xl font-bold text-foreground">{myTeam?.score ?? 0}</p>
        </div>
      </motion.div>
    );
  }

  // Leaderboard (Intermediate)
  if (game.phase === 'leaderboard') {
    const sorted = [...game.teams].sort((a, b) => b.score - a.score);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-6 p-6 w-full max-w-sm mx-auto"
      >
        <h2 className="text-2xl font-bold text-foreground">
          Standings after Round {game.currentRound}
        </h2>

        <div className="w-full space-y-2">
          {sorted.slice(0, 5).map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl border ${team.id === teamId ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}
            >
              <span className="text-lg font-bold text-muted-foreground w-8">#{i + 1}</span>
              {/* UPDATED: Uses the Emoji3D component from Antigravity updates */}
              <Emoji3D emoji={team.emoji} className="w-6 h-6" />
              <span className={`flex-1 font-medium ${team.id === teamId ? 'text-primary' : 'text-foreground'}`}>
                {team.name}
              </span>
              <span className="font-bold text-foreground">{team.score}</span>
            </motion.div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Waiting for host to continue...</p>
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

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6 p-8 text-center h-[80vh] justify-center"
      >
        {isWinner ? (
          <div className="relative">
            <PartyPopper className="w-20 h-20 text-gold animate-bounce" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 text-4xl"
            >
              👑
            </motion.div>
          </div>
        ) : (
          <Trophy className="w-16 h-16 text-primary/50" />
        )}

        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-foreground">
            {isWinner ? 'CHAMPION!' : 'Game Over'}
          </h2>
          <p className="text-muted-foreground text-lg">
            {isWinner ? 'You conquered the quiz!' : `Well played, ${teamName}.`}
          </p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-xs bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6"
        >
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Final Position
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className={`text-6xl font-black ${isWinner ? 'text-gold text-glow-gold' : 'text-foreground'}`}>
                #{myRank}
              </span>
              <span className="text-xl text-muted-foreground font-medium">
                / {totalTeams}
              </span>
            </div>
          </div>

          <div className="w-full h-px bg-border/50" />

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Final Score
            </p>
            <p className="text-3xl font-bold text-primary">
              {myTeam?.score ?? 0} <span className="text-base font-normal text-muted-foreground">pts</span>
            </p>
          </div>
        </motion.div>

        {!isWinner && (
          <p className="text-sm text-muted-foreground/60 italic mt-4">
            Better luck next time! 🍀
          </p>
        )}
      </motion.div>
    );
  }

  // Round Scores Adjustment Phase
  if (game.phase === 'round-scores-adjustment') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-8 text-center h-[80vh] justify-center"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <h2 className="text-2xl font-bold text-foreground">Score Verification</h2>
        <p className="text-muted-foreground">The host is finalizing scores for Round {game.currentRound}...</p>
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