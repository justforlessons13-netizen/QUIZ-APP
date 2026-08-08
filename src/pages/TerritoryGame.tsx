import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getFirestore, setDoc, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useTerritoryGame, QUESTION_SECONDS } from '@/hooks/useTerritoryGame';
import { TerritoryPack, TerritoryMode, TerritoryVisibility, TerritoryDuration, playerCountFor } from '@/types/territory';
import { getMapById } from '@/data/territory-maps';
import { LobbySetup } from '@/components/territory-game/LobbySetup';
import { BattleQuestion } from '@/components/territory-game/BattleQuestion';
import { RoundReveal } from '@/components/territory-game/RoundReveal';
import { FinalStandings } from '@/components/territory-game/FinalStandings';
import { gameThemes, alpha } from '@/lib/game-themes';

const theme = gameThemes.find((g) => g.id === 'territory')!;

function TerritoryGameController({
  pack, sessionId, mode, visibility, duration,
}: {
  pack: TerritoryPack; sessionId: string; mode: TerritoryMode; visibility: TerritoryVisibility; duration: TerritoryDuration;
}) {
  const navigate = useNavigate();
  const {
    game, ranked, addPlayer, removePlayer, startCapture, continueFromReveal, resetGame,
  } = useTerritoryGame(sessionId, pack.id, pack.name, pack.questions, mode, visibility, duration, true);

  const gameCode = game.gameCode;

  // Register the join code once we have one — mirrors HostGame.tsx's game-codes registration.
  useEffect(() => {
    if (!gameCode || !sessionId) return;
    const db = getFirestore();
    setDoc(doc(db, 'territory-codes', gameCode), { sessionId, packName: pack.name }).catch((err) => {
      console.error('Failed to create territory game code lookup:', err);
    });
  }, [gameCode, sessionId, pack.name]);

  const map = getMapById(game.mapId);
  const currentQuestion = game.currentQuestionId != null
    ? pack.questions.find((q) => q.id === game.currentQuestionId) ?? null
    : null;
  const activePlayers = game.players.filter((p) => !p.eliminated);
  const answeredCount = activePlayers.filter((p) => game.answers[p.id]).length;

  if (!map) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <p>Map not found for this session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden" style={{ background: `radial-gradient(ellipse at 50% 0%, rgba(255,140,60,0.12) 0%, oklch(10% 0.02 40) 60%)` }}>
      <header className="relative z-20 flex items-center gap-3 px-6 md:px-12 py-5">
        <button
          onClick={() => navigate('/territory')}
          title="Back"
          className="w-[34px] h-[34px] rounded-full border flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
          style={{ borderColor: alpha(theme.color1, 0.35), color: theme.color1 }}
        >
          ←
        </button>
        <span className="font-bungee text-base tracking-wide" style={{ color: theme.color1 }}>PLAYHUB</span>
      </header>

      <main className="relative z-20 flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {game.phase === 'lobby' && (
            <LobbySetup
              key="lobby"
              players={game.players}
              requiredCount={playerCountFor(mode)}
              mode={mode}
              gameCode={gameCode}
              packName={pack.name}
              map={map}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onStart={startCapture}
            />
          )}

          {(game.phase === 'capture' || game.phase === 'battle') && (
            <BattleQuestion
              key={`question-${game.currentQuestionId}`}
              phase={game.phase}
              question={currentQuestion}
              round={game.currentRound}
              totalRounds={game.totalBattleRounds}
              timeLeft={game.timeLeft}
              maxTime={QUESTION_SECONDS}
              players={game.players}
              map={map}
              answeredCount={answeredCount}
              totalActive={activePlayers.length}
            />
          )}

          {game.phase === 'round-reveal' && (
            <RoundReveal
              key="reveal"
              isCapturePhase={game.currentRound === 0}
              round={game.currentRound}
              players={game.players}
              map={map}
              lastCaptures={game.lastCaptures ?? {}}
              lastDefenders={game.lastDefenders ?? {}}
              lastIncome={game.lastIncome ?? {}}
              eliminatedThisRound={game.eliminatedThisRound ?? []}
              onContinue={continueFromReveal}
            />
          )}

          {(game.phase === 'final-standings' || game.phase === 'finished') && (
            <FinalStandings
              key="final"
              ranked={ranked}
              map={map}
              onPlayAgain={resetGame}
              onDashboard={() => navigate('/territory')}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function TerritoryGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';
  const packId = searchParams.get('pack') || '';
  const mode = (searchParams.get('mode') as TerritoryMode) || 'duo';
  const visibility = (searchParams.get('visibility') as TerritoryVisibility) || 'public';
  const duration = (searchParams.get('duration') as TerritoryDuration) || 'fast';

  const [pack, setPack] = useState<TerritoryPack | null>(null);
  const [fetchingPack, setFetchingPack] = useState(true);

  useEffect(() => {
    async function loadPack() {
      if (!packId) {
        setFetchingPack(false);
        return;
      }
      const db = getFirestore();
      try {
        const docRef = doc(db, 'territoryPacks', packId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPack(docSnap.data() as TerritoryPack);
        }
      } catch (error) {
        console.error('Error loading pack:', error);
      } finally {
        setFetchingPack(false);
      }
    }
    loadPack();
  }, [packId]);

  if (fetchingPack || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-[4px] border-[#ff8c3c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-muted-foreground tracking-wider">Pack not found</p>
          <Button onClick={() => navigate('/territory')} className="bg-[#ff8c3c] text-[#1a0f05] font-bungee">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return <TerritoryGameController pack={pack} sessionId={sessionId} mode={mode} visibility={visibility} duration={duration} />;
}
