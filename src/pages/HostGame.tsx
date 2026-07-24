import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveGame } from '@/hooks/useLiveGame';
import { QuestionPack } from '@/types/host';
import { TeamSetup } from '@/components/host-game/TeamSetup';
import { QuestionDisplay } from '@/components/host-game/QuestionDisplay';
import { HostGrading } from '@/components/host-game/HostGrading';
import { RoundReveal } from '@/components/host-game/RoundReveal';
import { LiveLeaderboard } from '@/components/host-game/LiveLeaderboard';
import { LotteryRandomizer } from '@/components/host-game/LotteryRandomizer';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore';
import { GameRulesDisplay } from '@/components/host-game/GameRulesDisplay';
import { RoundRulesDisplay } from '@/components/host-game/RoundRulesDisplay';
import { GamePhaseBackground } from '@/components/layout/GamePhaseBackground';
import { GameAudioController } from '@/components/layout/GameAudioController';
import { RemoteControlModal } from '@/components/host-game/RemoteControlModal';
import { HostLeaderboardModal } from '@/components/host-game/HostLeaderboardModal';
import { unlockWebAudio } from '@/lib/sounds';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'qgame')!;

function LiveGameController({
  pack,
  sessionId,
  initialProjectorMode = false
}: {
  pack: QuestionPack,
  sessionId: string,
  initialProjectorMode?: boolean
}) {
  const navigate = useNavigate();
  const [projectorMode, setProjectorMode] = useState(initialProjectorMode);
  const [showFullscreenBtn, setShowFullscreenBtn] = useState(false);

  useEffect(() => {
    if (!projectorMode) return;
    const handleMouseMove = (e: MouseEvent) => {
      setShowFullscreenBtn(e.clientY < 60);
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [projectorMode]);

  const prevPhase = useRef(pack ? 'team-setup' : '');

  const toggleProjectorMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => setProjectorMode(true)).catch(() => setProjectorMode(true));
    } else {
      document.exitFullscreen?.().then(() => {
        if (!initialProjectorMode) setProjectorMode(false);
      }).catch(() => {
        if (!initialProjectorMode) setProjectorMode(false);
      });
    }
  }, [initialProjectorMode]);

  const [showRemote, setShowRemote] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const openProjectorWindow = async () => {
    const projUrl = window.location.href + (window.location.href.includes('?') ? '&' : '?') + 'projector=true';

    try {
      if ('getScreenDetails' in window) {
        const screenDetails = await (window as any).getScreenDetails();
        const externalScreen = screenDetails.screens.find((s: any) => s.isExtended);

        if (externalScreen) {
          window.open(
            projUrl,
            'QGame_Projector',
            `left=${externalScreen.availLeft},top=${externalScreen.availTop},width=${externalScreen.availWidth},height=${externalScreen.availHeight},popup=1`
          );
          return;
        }
      }
    } catch (err) {
      console.warn("Screen Details API not available or permission denied", err);
    }

    // Fallback: specifically open as a popup window if we couldn't detect the extended screen
    window.open(projUrl, 'QGameProjector', 'popup=yes,width=1280,height=720,menubar=no,toolbar=no,location=no,status=no');
  };

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement && !initialProjectorMode) setProjectorMode(false);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, [initialProjectorMode]);

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
    finalizeRoundGrading,
    advanceToRoundRules,
    startRound,
    advanceFromReveal,
    advanceFromLeaderboard,
    advanceFromLottery,
    initializeLottery,
    drawLotteryNumber,
    replayLotteryConfetti,
    replayWinnerConfetti,
    resetGame,
    updateRevealStep,
    updateRuleIndex,
    updateRoundStepIndex,
    adjustTeamScore,
  } = useLiveGame(
    sessionId,
    pack.id,
    pack.name,
    pack.questions,
    pack.lotteryAfterRound
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

    if (game && prevPhase.current === 'round-rules' && game.phase === 'question' && projectorMode) {
      const audio = new Audio('/assets/here-we-go.mp3');
      audio.play().catch(() => { });
    }
    if (game) {
      prevPhase.current = game.phase;
    }
  }, [gameCode, sessionId, pack.name, game?.phase, projectorMode]);

  // Unlock Web Audio Context locally upon any interaction with the screen
  useEffect(() => {
    const unlock = () => { unlockWebAudio(); };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

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

  // Full round's question+answer data, for the Grading/Reveal steppers — every question in the
  // round already has a RoundState entry by the time grading/reveal starts (see finishQuestion).
  const roundQuestionData = pack.questions
    .map((q, questionIndex) => ({ q, questionIndex }))
    .filter(({ q }) => q.round === game.currentRound)
    .map(({ q, questionIndex }) => ({
      questionIndex,
      question: q,
      answers: game.rounds.find(r => r.questionIndex === questionIndex)?.answers ?? [],
    }));

  const answeredCount = currentRoundState?.answers.filter(a => a.answer.trim().length > 0).length ?? 0;
  const teamsTotal = game.teams.length;

  const currentMediaUrl = currentQuestion?.mediaUrl?.toLowerCase() || '';
  const questionHasSound = currentMediaUrl.includes('.mp3') ||
    currentMediaUrl.includes('.wav') ||
    currentMediaUrl.includes('.mp4') ||
    currentMediaUrl.includes('.webm');

  const totalRounds = Math.max(...pack.questions.map(q => q.round), 1);

  // Mirrors advanceFromReveal's own branching (useLiveGame.ts) purely for the Reveal
  // screen's continue-button label — kept in sync manually since the destination phase
  // isn't computed until the button is actually clicked.
  const hasMoreRoundsAfterCurrent = pack.questions.some(q => q.round > game.currentRound);
  const revealContinueLabel = !hasMoreRoundsAfterCurrent
    ? 'See Final Standings'
    : pack.lotteryAfterRound?.[game.currentRound]
      ? 'See Lottery Draw'
      : 'See Leaderboard';

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <GamePhaseBackground phase={game.phase} />

      <GameAudioController
        phase={game.phase}
        timerActive={game.timerActive}
        hasMediaContent={questionHasSound}
        volume={0.2}
        forceMuted={!projectorMode}
        hideControls={projectorMode}
      />

      {/* LOBBY NAV — only the team-setup phase gets a top nav; every other in-game
          screen (rules, question, grading, reveal, lottery, leaderboard...) relies solely
          on the bottom-left icon row for navigation, matching the source design. */}
      {!projectorMode && game.phase === 'team-setup' && (
        <header className="relative z-20 flex justify-between items-center w-full px-6 md:px-12 py-6 transition-all">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/host')}
              title="Back"
              className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
              style={{ borderColor: alpha(theme.color1, 0.35), color: theme.color1 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="font-bungee text-base tracking-wide" style={{ color: theme.color1 }}>
              PLAYHUB
            </span>
          </div>

          <div className="text-xs uppercase tracking-widest text-white/60">
            {pack.name}
          </div>

          <div className="flex items-center gap-1.5 bg-[#ff5050]/15 border border-[#ff5050]/20 rounded-full px-2.5 py-1.5 text-[10px] text-[#ff7070] font-bold tracking-[1.5px] uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444] animate-blinkSlow shadow-[0_0_8px_#ff4444]" />
            LIVE
          </div>
        </header>
      )}

      {/* Projector Minimal Header for team-setup phase */}
      {projectorMode && game.phase === 'team-setup' && (
        <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center w-full p-6 text-[#adbbff] font-bungee text-sm md:text-base tracking-wider transition-all pointer-events-none">
          <div className="flex-1"></div>
          <div className="opacity-80 text-center flex-1 uppercase tracking-widest pointer-events-auto">
            {pack.name}
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={toggleProjectorMode}
              className={`p-2 rounded-lg hover:bg-white/10 text-[#adbbff]/60 hover:text-white transition-all duration-300 pointer-events-auto ${showFullscreenBtn ? 'opacity-100' : 'opacity-0'}`}
            >
              {document.fullscreenElement ? <i className="ti ti-arrows-minimize text-[24px]" /> : <i className="ti ti-arrows-maximize text-[24px]" />}
            </button>
          </div>
        </header>
      )}

      {/* Hidden Projector Utility Bar (Shows only on hover) */}
      {projectorMode && game.phase !== 'team-setup' && (
        <div className="fixed top-0 left-0 right-0 h-[60px] z-50 flex justify-end items-start p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-4">
            {game.phase !== 'team-setup' && game.phase !== 'finished' && (
              <span className="text-xs text-muted-foreground bg-card/80 backdrop-blur px-3 py-1.5 rounded-lg border border-border/50 pointer-events-auto">
                R{game.currentRound} · Q{questionNumberInRound}/{totalQuestionsInRound}
              </span>
            )}
            <button onClick={toggleProjectorMode} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-[#adbbff]/60 hover:text-white transition-all duration-300 pointer-events-auto font-bungee tracking-widest uppercase text-[12px]">
              {document.fullscreenElement ? (
                <><i className="ti ti-arrows-minimize text-[20px]" /> Exit</>
              ) : (
                <><i className="ti ti-arrows-maximize text-[20px]" /> Fullscreen</>
              )}
            </button>
            {game.phase !== 'team-setup' && (
              <button onClick={resetGame} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-[#adbbff]/60 hover:text-white transition-all duration-300 pointer-events-auto font-bungee tracking-widest uppercase text-[12px]">
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            )}
          </div>
        </div>
      )}

      <main className={`relative z-20 flex-1 h-full flex flex-col items-center justify-center ${projectorMode ? 'p-8' : 'p-4'}`}>
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
              sessionId={sessionId}
              packId={pack.id}
            />
          )}

          {game.phase === 'game-rules' && (
            <GameRulesDisplay
              key="game-rules"
              projectorMode={projectorMode}
              onContinue={advanceToRoundRules}
              currentRuleIndex={game.currentRuleIndex}
              onSetRuleIndex={updateRuleIndex}
            />
          )}

          {game.phase === 'round-rules' && (
            <RoundRulesDisplay
              key={`round-rules-${game.currentRound}`}
              round={game.currentRound}
              totalRounds={totalRounds}
              roundName={pack.roundNames?.[game.currentRound]}
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
              totalRounds={totalRounds}
              questionInRound={questionNumberInRound}
              totalInRound={totalQuestionsInRound}
              timeLeft={game.timeLeft}
              maxTime={maxTime}
              onActivate={startTimer}
              onCollectAnswers={finishQuestion}
              projectorMode={projectorMode}
              timerActive={game.timerActive}
              packName={pack.name}
              answeredCount={answeredCount}
              teamsTotal={teamsTotal}
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

                <p className="font-sugo text-[20px] md:text-[26px] uppercase tracking-widest bg-gradient-to-r from-[#d9d9d9] via-[#b4b9d6] to-[#737373] bg-clip-text text-transparent">
                  Check your device when grading completes.
                </p>
              </motion.div>
            ) : (
              <HostGrading
                key={`grading-${game.currentRound}`}
                teams={game.teams}
                questions={roundQuestionData}
                round={game.currentRound}
                onSetCorrectness={setAnswerCorrectness}
                onFinishRound={finalizeRoundGrading}
              />
            )
          )}

          {game.phase === 'reveal' && roundQuestionData.length > 0 && (
            <RoundReveal
              key={`reveal-${game.currentRound}`}
              questions={roundQuestionData}
              round={game.currentRound}
              onContinue={advanceFromReveal}
              continueLabel={revealContinueLabel}
              projectorMode={projectorMode}
              viewIndex={game.roundStepIndex ?? 0}
              onSetViewIndex={updateRoundStepIndex}
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
              onReplayConfetti={replayLotteryConfetti}
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
              winnerConfettiPlays={game.winnerConfettiPlays}
              onReplayWinnerConfetti={replayWinnerConfetti}
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

      {/* ── GLOBAL HOST BOTTOM ACTIONS ── */}
      {!projectorMode && (
        <div className="fixed bottom-[24px] left-[24px] z-[60] flex items-center gap-2.5 pointer-events-none">
          <div className="flex items-center gap-2.5 pointer-events-auto">
            <button
              onClick={() => setPhase('team-setup')}
              className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex items-center justify-center hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all"
              title="Home (Lobby)"
            >
              <img src="/home.svg" alt="Home" className="h-[18px] w-auto pointer-events-none" />
            </button>
            <button
              onClick={openProjectorWindow}
              className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex items-center justify-center hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all"
              title="Open Projector Window"
            >
              <img src="/project.svg" alt="Projector" className="h-[18px] w-auto pointer-events-none" />
            </button>
            <button
              onClick={() => setShowRemote(true)}
              className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex items-center justify-center hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all"
              title="Remote Control"
            >
              <img src="/remote.svg" alt="Remote" className="h-[18px] w-auto pointer-events-none" />
            </button>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="w-10 h-10 rounded-[11px] bg-white/[0.07] border border-white/[0.12] flex items-center justify-center hover:scale-110 hover:bg-white/[0.12] active:scale-95 transition-all"
              title="Edit Scores"
            >
              <img src="/leaderboard.svg" alt="Edit Scores" className="h-[18px] w-auto pointer-events-none" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <RemoteControlModal
        open={showRemote}
        onOpenChange={setShowRemote}
        gameCode={gameCode}
        sessionId={sessionId}
        packId={pack.id}
      />
      <HostLeaderboardModal
        open={showLeaderboard}
        onOpenChange={setShowLeaderboard}
        teams={game.teams}
        currentRound={game.currentRound}
        totalRounds={totalRounds}
        onAdjustScore={adjustTeamScore}
      />

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
          <p className="text-xl text-muted-foreground tracking-wider">Pack not found</p>
          <Button onClick={() => navigate('/host')} className="bg-[#adbbff] text-[#120524] font-bungee">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <LiveGameController
      pack={pack}
      sessionId={sessionId}
      initialProjectorMode={searchParams.get('projector') === 'true'}
    />
  );
}
