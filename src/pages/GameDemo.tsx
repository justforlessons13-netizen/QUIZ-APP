import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Emoji3D } from '@/components/ui/Emoji3D';
import { sampleQuestions, initialTeams } from '@/data/sample-questions';
import { Team, GamePhase, calculateScore, checkAnswer } from '@/types/game';
import { AnswerPhase } from '@/components/game/AnswerPhase';
import { RevealPhase } from '@/components/game/RevealPhase';
import { GradingOverlay } from '@/components/game/GradingOverlay';
import { LeaderboardReveal } from '@/components/game/LeaderboardReveal';

const LEADERBOARD_ROUNDS = [2, 4, 6];

export default function GameDemo() {
  const navigate = useNavigate();
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [teams, setTeams] = useState<Team[]>(() => initialTeams.map(t => ({ ...t, roundScores: [] })));
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [playerDraft, setPlayerDraft] = useState('');
  const [isWagered, setIsWagered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [roundResult, setRoundResult] = useState<{ isCorrect: boolean; points: number } | null>(null);

  const transitionRef = useRef(false);
  const currentQuestion = sampleQuestions[currentRound - 1];
  const playerScore = teams.find(t => t.isPlayer)?.score ?? 0;

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timerActive, timeLeft]);

  // Handle timer expiry
  useEffect(() => {
    if (timeLeft > 0 || !timerActive || transitionRef.current) return;
    transitionRef.current = true;
    setTimerActive(false);

    if (phase === 'question') {
      // Auto-save draft and move to recap
      setPlayerDraft(playerAnswer);
      setPhase('recap');
      setTimeLeft(15);
      setMaxTime(15);
      setTimerActive(true);
      transitionRef.current = false;
    } else if (phase === 'recap') {
      transitionRef.current = false;
      doGrading(playerAnswer || playerDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timerActive]);

  const doGrading = useCallback((finalAnswer: string) => {
    const q = sampleQuestions[currentRound - 1];
    const isCorrect = checkAnswer(finalAnswer, q.answer);
    const points = calculateScore(currentRound === 6, isCorrect, isWagered);

    setTeams(prev => prev.map(team => {
      if (team.isPlayer) {
        return { ...team, score: team.score + points, roundScores: [...team.roundScores, points] };
      }
      // AI teams
      const aiCorrect = Math.random() > 0.4;
      const aiWagered = currentRound === 6 ? Math.random() > 0.5 : false;
      const aiPoints = calculateScore(currentRound === 6, aiCorrect, aiWagered);
      return { ...team, score: team.score + aiPoints, roundScores: [...team.roundScores, aiPoints] };
    }));

    setRoundResult({ isCorrect, points });
    setPhase('grading');
    setTimeout(() => setPhase('reveal'), 2000);
  }, [currentRound, isWagered]);

  const startGame = () => {
    setPhase('question');
    const time = currentRound < 6 ? 45 : 60;
    setTimeLeft(time);
    setMaxTime(time);
    setTimerActive(true);
    setPlayerAnswer('');
    setIsWagered(false);
  };

  const handleSubmitDraft = () => {
    setTimerActive(false);
    setPlayerDraft(playerAnswer);
    setPhase('recap');
    setTimeLeft(15);
    setMaxTime(15);
    setTimerActive(true);
  };

  const handleSubmitFinal = () => {
    setTimerActive(false);
    doGrading(playerAnswer || playerDraft);
  };

  const advanceFromReveal = () => {
    if (LEADERBOARD_ROUNDS.includes(currentRound)) {
      setPhase(currentRound === 6 ? 'final-reveal' : 'leaderboard');
    } else if (currentRound < 6) {
      nextRound();
    } else {
      setPhase('finished');
    }
  };

  const advanceFromLeaderboard = () => {
    if (currentRound < 6) {
      nextRound();
    } else {
      setPhase('finished');
    }
  };

  const nextRound = () => {
    const nextR = currentRound + 1;
    setCurrentRound(nextR);
    setPlayerAnswer('');
    setPlayerDraft('');
    setIsWagered(false);
    setRoundResult(null);
    setPhase('question');
    const time = nextR < 6 ? 45 : 60;
    setTimeLeft(time);
    setMaxTime(time);
    setTimerActive(true);
  };

  const resetGame = () => {
    setCurrentRound(1);
    setPhase('lobby');
    setTeams(initialTeams.map(t => ({ ...t, roundScores: [] })));
    setPlayerAnswer('');
    setPlayerDraft('');
    setIsWagered(false);
    setTimeLeft(0);
    setTimerActive(false);
    setRoundResult(null);
    transitionRef.current = false;
  };

  return (
    <div className="min-h-screen bg-radial-dark flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {phase !== 'lobby' && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Round {currentRound}/6</span>
            <span className="px-2 py-1 rounded-md bg-primary/15 text-primary font-bold tabular-nums">
              {playerScore} pts
            </span>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* LOBBY */}
          {phase === 'lobby' && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-6 w-full max-w-md mx-auto px-4"
            >
              <h1 className="text-4xl font-bold text-primary text-glow-primary">QGame</h1>
              <p className="text-muted-foreground text-center">Demo Mode · 6 Rounds · You vs AI Teams</p>

              <div className="w-full space-y-2 mt-2">
                {teams.map(team => (
                  <div
                    key={team.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${team.isPlayer ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'
                      }`}
                  >
                    <Emoji3D emoji={team.emoji} className="w-6 h-6" />
                    <span className={`font-semibold ${team.isPlayer ? 'text-primary' : 'text-foreground'}`}>
                      {team.name}
                    </span>
                    {team.isPlayer && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">You</span>
                    )}
                  </div>
                ))}
              </div>

              <Button onClick={startGame} className="w-full py-4 h-auto text-lg font-bold rounded-xl box-glow-primary">
                Start Game
              </Button>
            </motion.div>
          )}

          {/* QUESTION / RECAP */}
          {(phase === 'question' || phase === 'recap') && currentQuestion && (
            <AnswerPhase
              key={`answer-${currentRound}-${phase}`}
              question={currentQuestion}
              round={currentRound}
              isRecap={phase === 'recap'}
              answer={playerAnswer}
              onAnswerChange={setPlayerAnswer}
              isWagered={isWagered}
              onWagerChange={setIsWagered}
              timeLeft={timeLeft}
              maxTime={maxTime}
              onSubmit={phase === 'question' ? handleSubmitDraft : handleSubmitFinal}
            />
          )}

          {/* GRADING */}
          {phase === 'grading' && <GradingOverlay key="grading" />}

          {/* REVEAL */}
          {phase === 'reveal' && currentQuestion && roundResult && (
            <RevealPhase
              key={`reveal-${currentRound}`}
              question={currentQuestion}
              playerAnswer={playerAnswer || playerDraft}
              isCorrect={roundResult.isCorrect}
              points={roundResult.points}
              isWagered={isWagered}
              round={currentRound}
              onContinue={advanceFromReveal}
            />
          )}

          {/* LEADERBOARD (Intermediate) */}
          {phase === 'leaderboard' && (
            <LeaderboardReveal
              key="leaderboard"
              teams={teams}
              isFinal={false}
              currentRound={currentRound}
              onContinue={advanceFromLeaderboard}
            />
          )}

          {/* FINAL REVEAL */}
          {phase === 'final-reveal' && (
            <LeaderboardReveal
              key="final-reveal"
              teams={teams}
              isFinal={true}
              currentRound={currentRound}
              onContinue={() => setPhase('finished')}
            />
          )}

          {/* FINISHED */}
          {phase === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6 px-4"
            >
              <h1 className="text-4xl font-bold text-gold text-glow-gold">Game Over!</h1>
              <p className="text-xl text-muted-foreground">
                Your final score: <span className="text-foreground font-bold">{playerScore}</span>
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button onClick={resetGame} className="flex-1 py-3 h-auto font-bold rounded-xl">
                  Play Again
                </Button>
                <Button variant="secondary" onClick={() => navigate('/')} className="flex-1 py-3 h-auto font-bold rounded-xl">
                  Home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
