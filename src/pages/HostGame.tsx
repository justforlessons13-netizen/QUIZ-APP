import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveGame } from '@/hooks/useLiveGame';
import { QuestionPack } from '@/types/host';
import { TeamSetup } from '@/components/host-game/TeamSetup';
import { QuestionDisplay } from '@/components/host-game/QuestionDisplay';
import { HostGrading } from '@/components/host-game/HostGrading';
import { RoundReveal } from '@/components/host-game/RoundReveal';
import { LiveLeaderboard } from '@/components/host-game/LiveLeaderboard';
import { LotteryRandomizer } from '@/components/host-game/LotteryRandomizer';
import { useEffect, useState, useCallback } from 'react';
import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore';
import { GameRulesDisplay } from '@/components/host-game/GameRulesDisplay';
import { RoundRulesDisplay } from '@/components/host-game/RoundRulesDisplay';
import { GamePhaseBackground } from '@/components/layout/GamePhaseBackground';
import { GameAudioController } from '@/components/layout/GameAudioController';

function LiveGameController({
  pack,
  sessionId
}: {
  pack: QuestionPack,
  sessionId: string
}) {
  const navigate = useNavigate();
  const [projectorMode, setProjectorMode] = useState(false);

  const toggleProjectorMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setProjectorMode(true)).catch(() => setProjectorMode(true));
    } else {
      document.exitFullscreen?.().then(() => setProjectorMode(false)).catch(() => setProjectorMode(false));
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) setProjectorMode(false);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const {
    game,
    setPhase,
    addTeam,
    removeTeam,
    startGame,
    stopTimer,
    startTimer,
    finishQuestion,
    updateTeamAnswer,
    autoGrade,
    setAnswerCorrectness,
    finalizeGrading,
    advanceToRoundRules,
    startRound,
    advanceFromReveal,
    advanceFromLeaderboard,
    advanceFromLottery,
    initializeLottery,
    drawLotteryNumber,
    resetGame,
    updateRevealStep,
  } = useLiveGame(
    sessionId,
    pack.id,
    pack.name,
    pack.questions
  );

  const gameCode = game.gameCode;

  useEffect(() => {
    if (gameCode && sessionId) {
      const db = getFirestore();
      const codeDocRef = doc(db, 'game-codes', gameCode);
      setDoc(codeDocRef, {
        sessionId,
        packName: pack.name
      }).catch(err => {
        console.error("Failed to create game code lookup:", err);
      });
    }
  }, [gameCode, sessionId, pack.name]);

  const currentQuestion = game.currentQuestionIndex < pack.questions.length
    ? pack.questions[game.currentQuestionIndex]
    : undefined;
  const currentRoundState = game.rounds.find(r => r.questionIndex === game.currentQuestionIndex);
  const maxTime = (currentQuestion?.round ?? 1) < 6 ? 45 : 60;

  const questionsInCurrentRound = pack.questions.filter(q => q.round === game.currentRound);
  const questionNumberInRound = currentQuestion
    ? questionsInCurrentRound.findIndex(q => q.id === currentQuestion.id) + 1
    : 1;
  const totalQuestionsInRound = questionsInCurrentRound.length;

  const currentMediaUrl = currentQuestion?.mediaUrl?.toLowerCase() || '';
  const questionHasSound = currentMediaUrl.includes('.mp3') ||
    currentMediaUrl.includes('.wav') ||
    currentMediaUrl.includes('.mp4') ||
    currentMediaUrl.includes('.webm');

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <GamePhaseBackground phase={game.phase} />

      <GameAudioController
        phase={game.phase}
        timerActive={game.timerActive}
        hasMediaContent={questionHasSound}
        volume={0.2}
        forceMuted={!projectorMode}
      />

      {/* FIXED HEADER: Now matches your Canva mockups perfectly */}
      {!projectorMode && (
        <header className="relative z-20 flex justify-between items-center w-full p-6 text-[#adbbff] font-bungee text-sm md:text-base tracking-wider transition-all">
          <button
            onClick={() => navigate('/host')}
            className="flex items-center gap-3 hover:text-white transition-colors uppercase"
          >
            <ArrowLeft className="w-5 h-5" />
            Home
          </button>

          <div className="opacity-80 text-center flex-1 hidden sm:block uppercase tracking-widest">
            {pack.name}
          </div>

          <button
            onClick={toggleProjectorMode}
            className="flex items-center gap-3 hover:text-white transition-colors uppercase"
          >
            <Maximize className="w-5 h-5" />
            Projector
          </button>
        </header>
      )}

      {/* Hidden Projector Utility Bar (Shows only on hover) */}
      {projectorMode && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
          {game.phase !== 'team-setup' && game.phase !== 'finished' && (
            <span className="text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border/50">
              R{game.currentRound} · Q{questionNumberInRound}/{totalQuestionsInRound}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={toggleProjectorMode} className="bg-card/80 backdrop-blur border border-border/50">
            <Minimize className="w-4 h-4 mr-1" /> Exit
          </Button>
          {game.phase !== 'team-setup' && (
            <Button variant="secondary" size="sm" onClick={resetGame} className="bg-card/80 backdrop-blur border border-border/50">
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      <main className={`relative z-20 flex-1 flex items-center justify-center ${projectorMode ? 'p-8' : 'p-4'}`}>
        <AnimatePresence mode="wait">
          {game.phase === 'team-setup' && (
            <TeamSetup
              key="team-setup"
              teams={game.teams}
              onAddTeam={addTeam}
              onRemoveTeam={removeTeam}
              onStart={startGame}
              gameCode={gameCode}
              projectorMode={projectorMode}
            />
          )}

          {game.phase === 'game-rules' && (
            <GameRulesDisplay
              key="game-rules"
              rules={pack.gameRules}
              projectorMode={projectorMode}
              onContinue={advanceToRoundRules}
            />
          )}

          {game.phase === 'round-rules' && (
            <RoundRulesDisplay
              key={`round-rules-${game.currentRound}`}
              round={game.currentRound}
              rules={pack.roundRules?.[game.currentRound]}
              projectorMode={projectorMode}
              onStartRound={startRound}
            />
          )}

          {game.phase === 'question' && currentQuestion && (
            <QuestionDisplay
              key={`question-${game.currentQuestionIndex}`}
              question={currentQuestion}
              round={game.currentRound}
              totalRounds={6}
              questionInRound={questionNumberInRound}
              totalInRound={totalQuestionsInRound}
              timeLeft={game.timeLeft}
              maxTime={maxTime}
              onActivate={startTimer}
              onCollectAnswers={finishQuestion}
              projectorMode={projectorMode}
              timerActive={game.timerActive}
            />
          )}

          {game.phase === 'grading' && currentQuestion && currentRoundState && (
            projectorMode ? (
              <motion.div
                key={`grading-placeholder-${game.currentQuestionIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center mt-6 px-4"
              >
                {/* Loader matches the specific neon blue theme */}
                <div className="w-16 h-16 border-[4px] border-[#adbbff] border-t-transparent rounded-full animate-spin mb-4" />

                {/* Bungee Font matching Canva sizing */}
                <h2 className="font-bungee text-[32px] md:text-[45px] text-[#adbbff] uppercase tracking-wider mt-8 mb-4 drop-shadow-md">
                  Host is grading...
                </h2>

                {/* Sugo Font with perfectly mapped gradient text */}
                <p className="font-sugo text-[20px] md:text-[26px] uppercase tracking-widest bg-gradient-to-r from-[#d9d9d9] via-[#b4b9d6] to-[#737373] bg-clip-text text-transparent">
                  Check your device when grading completes.
                </p>
              </motion.div>
            ) : (
              <HostGrading
                key={`grading-${game.currentQuestionIndex}`}
                teams={game.teams}
                answers={currentRoundState.answers}
                question={currentQuestion}
                round={game.currentRound}
                questionInRound={questionNumberInRound}
                totalInRound={totalQuestionsInRound}
                onSetCorrectness={setAnswerCorrectness}
                onFinalize={finalizeGrading}
              />
            )
          )}

          {game.phase === 'reveal' && currentQuestion && currentRoundState && (
            <RoundReveal
              key={`reveal-${game.currentQuestionIndex}`}
              teams={game.teams}
              answers={currentRoundState.answers}
              question={currentQuestion}
              round={game.currentRound}
              totalRounds={6}
              onContinue={advanceFromReveal}
              projectorMode={projectorMode}
              questionInRound={questionNumberInRound}
            />
          )}

          {game.phase === 'lottery' && (
            <LotteryRandomizer
              key="lottery"
              lotteryState={game.lotteryState}
              projectorMode={projectorMode}
              onInitialize={initializeLottery}
              onDraw={drawLotteryNumber}
              onContinue={advanceFromLottery}
            />
          )}

          {game.phase === 'leaderboard' && (
            <LiveLeaderboard
              key="leaderboard"
              teams={game.teams}
              isFinal={false}
              currentRound={game.currentRound}
              onContinue={advanceFromLeaderboard}
              projectorMode={projectorMode}
            />
          )}

          {game.phase === 'final-reveal' && (
            <LiveLeaderboard
              key="final-reveal"
              teams={game.teams}
              isFinal={true}
              currentRound={game.currentRound}
              onContinue={() => setPhase('finished')}
              projectorMode={projectorMode}
              revealStep={game.revealStep || 0}
              onSetRevealStep={updateRevealStep}
            />
          )}

          {game.phase === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-6 px-4"
            >
              <h1 className={`font-bold text-gold text-glow-gold ${projectorMode ? 'text-6xl' : 'text-4xl'}`}>Game Over!</h1>
              <p className={`text-muted-foreground ${projectorMode ? 'text-2xl' : 'text-lg'}`}>
                {pack.name} — {game.teams.length} teams
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button onClick={resetGame} className="flex-1 py-3 h-auto font-bold rounded-xl">
                  Play Again
                </Button>
                <Button variant="secondary" onClick={() => navigate('/host')} className="flex-1 py-3 h-auto font-bold rounded-xl">
                  Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function HostGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const packId = searchParams.get('pack') || '';

  const [pack, setPack] = useState<QuestionPack | null>(null);
  const [fetchingPack, setFetchingPack] = useState(true);

  useEffect(() => {
    async function loadPack() {
      if (!packId) {
        setFetchingPack(false);
        return;
      }
      const db = getFirestore();
      try {
        const docRef = doc(db, 'questionPacks', packId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPack(docSnap.data() as QuestionPack);
        }
      } catch (error) {
        console.error("Error loading pack:", error);
      } finally {
        setFetchingPack(false);
      }
    }
    loadPack();
  }, [packId]);

  if (fetchingPack || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[4px] border-[#adbbff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground font-sugo tracking-wider">Pack not found</p>
          <Button onClick={() => navigate('/host')} className="bg-[#adbbff] text-[#120524] font-bungee">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <LiveGameController
      pack={pack}
      sessionId={sessionId}
    />
  );
}